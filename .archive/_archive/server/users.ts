// @ts-nocheck
import { createLogger, logError } from "./logger.js";
const logger = createLogger("users");
import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import prisma from "./prisma.js";
import { authenticate, requireAdmin } from "./middleware.js";
import { sendSMS, normalizePhone, validatePhone } from "./simpletexting.js";
import { AuthenticatedRequest, UserProfileUpdate, getErrorMessage } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for profile picture uploads
// Store uploads in persistent directory outside dist/ to survive rebuilds
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Store in project root /uploads/profiles (persists through builds)
    const uploadPath = path.join(process.cwd(), "uploads", "profiles");

    // Ensure directory exists before writing
    fs.mkdirSync(uploadPath, { recursive: true });

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const userId = (req as AuthenticatedRequest).user?.id;
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

router.get("/", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      displayName: true,
      city: true,
      state: true,
      favoriteCastaway: true,
      about: true,
      isAdmin: true,
      createdAt: true
    }
  });
  res.json(users);
});

router.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      displayName: true,
      city: true,
      state: true,
      favoriteCastaway: true,
      favoriteCharity: true,
      charityUrl: true,
      about: true,
      profilePicture: true,
      phone: true,
      phoneVerified: true,
      smsEnabled: true,
      isAdmin: true,
      hasSeenWelcome: true,
      createdAt: true
    }
  });
  res.json(user);
});

router.put("/me", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name } = req.body as { name?: string };
  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { id: true, email: true, name: true, isAdmin: true, createdAt: true }
  });
  res.json(user);
});

router.put("/profile", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { name, email, username, displayName, city, state, favoriteCastaway, favoriteCharity, charityUrl, about } = req.body as {
    name?: string;
    email?: string;
    username?: string;
    displayName?: string;
    city?: string;
    state?: string;
    favoriteCastaway?: string;
    favoriteCharity?: string;
    charityUrl?: string;
    about?: string;
  };

  // Server-side validation for character limits
  if (favoriteCastaway && favoriteCastaway.length > 35) {
    return res.status(400).json({ error: "Favorite castaway must be 35 characters or less" });
  }
  if (favoriteCharity && favoriteCharity.length > 100) {
    return res.status(400).json({ error: "Charity name must be 100 characters or less" });
  }
  if (charityUrl && charityUrl.length > 200) {
    return res.status(400).json({ error: "Charity URL must be 200 characters or less" });
  }
  if (about && about.length > 250) {
    return res.status(400).json({ error: "About must be 250 characters or less" });
  }

  const updateData: UserProfileUpdate = {};
  if (name) updateData.name = name;
  if (username !== undefined) {
    // Check if username is already taken by another user
    if (username) {
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }
    updateData.username = username || null;
  }
  if (displayName !== undefined) updateData.displayName = displayName || null;
  if (city !== undefined) updateData.city = city || null;
  if (state !== undefined) updateData.state = state || null;
  if (favoriteCastaway !== undefined) updateData.favoriteCastaway = favoriteCastaway || null;
  if (favoriteCharity !== undefined) updateData.favoriteCharity = favoriteCharity || null;
  if (charityUrl !== undefined) updateData.charityUrl = charityUrl || null;
  if (about !== undefined) updateData.about = about || null;
  if (email) {
    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ error: "Email already in use" });
    }
    updateData.email = email;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      displayName: true,
      city: true,
      state: true,
      favoriteCastaway: true,
      favoriteCharity: true,
      charityUrl: true,
      about: true,
      profilePicture: true,
      isAdmin: true,
      createdAt: true
    }
  });

  res.json({ user });
});

router.put("/password", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  // Verify current password
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true }
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // OAuth users don't have passwords
  if (!user.password) {
    return res.status(400).json({ error: "OAuth users cannot change password this way" });
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  // Hash and update new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });

  res.json({ message: "Password updated successfully" });
});

// Profile stats endpoint - league activity and achievements
router.get("/profile-stats", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  // Get league memberships
  const memberships = await prisma.leagueMembership.findMany({
    where: {
      userId,
      isActive: true
    },
    include: {
      league: {
        select: {
          id: true,
          name: true,
          type: true
        }
      }
    }
  });

  // Get all scores across all leagues
  const scores = await prisma.score.findMany({
    where: { userId },
    select: {
      points: true,
      leagueId: true,
      week: {
        select: {
          weekNumber: true
        }
      }
    }
  });

  // Calculate total points
  const totalPoints = scores.reduce((sum, s) => sum + s.points, 0);

  // Calculate best league performance
  const pointsByLeague = scores.reduce((acc, score) => {
    if (!score.leagueId) return acc;
    if (!acc[score.leagueId]) {
      acc[score.leagueId] = 0;
    }
    acc[score.leagueId] += score.points;
    return acc;
  }, {} as Record<string, number>);

  const bestLeague = Object.entries(pointsByLeague)
    .sort(([, a], [, b]) => b - a)[0];

  const bestLeagueName = bestLeague
    ? memberships.find(m => m.leagueId === bestLeague[0])?.league.name
    : null;

  res.json({
    leagueCount: memberships.length,
    officialLeagueCount: memberships.filter(m => m.league.type === 'OFFICIAL').length,
    customLeagueCount: memberships.filter(m => m.league.type === 'CUSTOM').length,
    totalPoints,
    bestLeaguePoints: bestLeague ? bestLeague[1] : 0,
    bestLeagueName,
    weeksPlayed: new Set(scores.map(s => s.week.weekNumber)).size
  });
});

// Profile picture upload endpoint
router.post("/profile-picture", authenticate, upload.single("profilePicture"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Create the public URL for the uploaded file
    const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;

    // Update user's profilePicture field in database
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: profilePictureUrl },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        profilePicture: true,
        isAdmin: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error: unknown) {
    logger.error("Profile picture upload error:", error);
    res.status(500).json({ error: getErrorMessage(error) || "Failed to upload profile picture" });
  }
});

router.put("/:id/admin", requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isAdmin } = req.body as { isAdmin?: boolean };
  const currentUserId = req.user?.id;

  if (typeof isAdmin !== "boolean") {
    return res.status(400).json({ error: "isAdmin must be a boolean" });
  }

  // SECURITY: Prevent users from modifying their own admin status
  if (id === currentUserId) {
    return res.status(403).json({ error: "Cannot modify your own admin status" });
  }

  const updated = await prisma.user.update({ where: { id }, data: { isAdmin } });
  res.json(updated);
});

// Admin endpoints
router.put("/admin/users/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    username,
    displayName,
    city,
    state,
    favoriteCastaway,
    about,
    phone
  } = req.body as {
    name?: string;
    email?: string;
    username?: string;
    displayName?: string;
    city?: string;
    state?: string;
    favoriteCastaway?: string;
    about?: string;
    phone?: string;
  };

  const updateData: UserProfileUpdate = {};

  if (name !== undefined) updateData.name = name;

  if (email !== undefined) {
    // Check if email is already taken by another user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser && existingUser.id !== id) {
      return res.status(400).json({ error: "Email already in use" });
    }
    updateData.email = email;
  }

  if (username !== undefined) {
    if (username) {
      // Check if username is already taken by another user
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }
    updateData.username = username || null;
  }

  if (phone !== undefined) {
    if (phone) {
      // Validate and normalize phone
      if (!validatePhone(phone)) {
        return res.status(400).json({ error: "Invalid phone number. Must be 10 digits (US)" });
      }
      const normalized = normalizePhone(phone);
      // Check if phone is already taken by another user
      const existingUser = await prisma.user.findUnique({ where: { phone: normalized } });
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ error: "Phone number already in use" });
      }
      updateData.phone = normalized;
    } else {
      updateData.phone = null;
    }
  }

  if (displayName !== undefined) updateData.displayName = displayName || null;
  if (city !== undefined) updateData.city = city || null;
  if (state !== undefined) updateData.state = state || null;
  if (favoriteCastaway !== undefined) updateData.favoriteCastaway = favoriteCastaway || null;
  if (about !== undefined) updateData.about = about || null;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      displayName: true,
      city: true,
      state: true,
      favoriteCastaway: true,
      about: true,
      phone: true,
      isAdmin: true,
      createdAt: true
    }
  });

  res.json({ user });
});

router.post("/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
  const { id } = req.params;

  // SECURITY: Generate cryptographically secure temporary password (32 chars)
  const crypto = await import('crypto');
  const tempPassword = crypto.randomBytes(16).toString('hex');
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // Get user email for secure delivery
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, name: true }
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword }
  });

  // SECURITY NOTE: In production, send password via email instead of returning in response
  // For now, return with warning to admin
  res.json({
    tempPassword,
    message: "Password reset successfully. IMPORTANT: Share this password securely with the user.",
    userEmail: user.email
  });
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id }, select: { isAdmin: true } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.isAdmin) {
      return res.status(403).json({ error: "Cannot delete admin users" });
    }

    // Delete all related records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all user's related data
      await tx.feedback.deleteMany({ where: { userId: id } });
      await tx.sMSLog.deleteMany({ where: { userId: id } });
      await tx.pick.deleteMany({ where: { userId: id } });
      await tx.score.deleteMany({ where: { userId: id } });
      await tx.draftPick.deleteMany({ where: { userId: id } });

      // Delete ranking and its entries
      const ranking = await tx.ranking.findUnique({ where: { userId: id } });
      if (ranking) {
        await tx.rankingEntry.deleteMany({ where: { rankingId: ranking.id } });
        await tx.ranking.delete({ where: { id: ranking.id } });
      }

      // Finally delete the user
      await tx.user.delete({ where: { id } });
    });

    res.json({ message: "User deleted successfully" });
  } catch (error: unknown) {
    logger.error("Failed to delete user:", error);
    res.status(500).json({ error: getErrorMessage(error) || "Failed to delete user" });
  }
});

router.post("/mark-welcome-seen", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { hasSeenWelcome: true }
    });

    res.json({ message: "Welcome marked as seen" });
  } catch (error) {
    logger.error("Failed to mark welcome as seen:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// SMS Phone Number Management
router.post("/me/phone", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { phone } = req.body as { phone?: string };

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  // Validate phone format
  if (!validatePhone(phone)) {
    return res.status(400).json({ error: "Invalid phone number. Must be 10 digits (US)" });
  }

  const normalized = normalizePhone(phone);

  try {
    // Check if phone is already in use by another user
    const existing = await prisma.user.findUnique({ where: { phone: normalized } });
    if (existing && existing.id !== userId) {
      return res.status(400).json({ error: "Phone number already in use" });
    }

    // Update user's phone number
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        phone: normalized,
        phoneVerified: false, // Reset verification when phone changes
        smsEnabled: true
      },
      select: {
        id: true,
        phone: true,
        phoneVerified: true,
        smsEnabled: true
      }
    });

    // Send welcome SMS
    try {
      await sendSMS({
        to: normalized,
        text: "Welcome to RGFL SMS! Reply HELP for commands. Reply STOP to opt out."
      });
    } catch (smsError) {
      logger.error("Failed to send welcome SMS:", smsError);
      // Don't fail the request if SMS fails
    }

    res.json({ user, message: "Phone number added successfully" });
  } catch (error) {
    logger.error("Failed to add phone number:", error);
    res.status(500).json({ error: "Failed to add phone number" });
  }
});

router.delete("/me/phone", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        phone: null,
        phoneVerified: false,
        smsEnabled: true // Reset to default
      },
      select: {
        id: true,
        phone: true,
        phoneVerified: true,
        smsEnabled: true
      }
    });

    res.json({ user, message: "Phone number removed successfully" });
  } catch (error) {
    logger.error("Failed to remove phone number:", error);
    res.status(500).json({ error: "Failed to remove phone number" });
  }
});

router.post("/me/sms-toggle", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { enabled } = req.body as { enabled?: boolean };

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "enabled must be a boolean" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { smsEnabled: enabled },
      select: {
        id: true,
        phone: true,
        phoneVerified: true,
        smsEnabled: true
      }
    });

    res.json({ user, message: `SMS ${enabled ? "enabled" : "disabled"} successfully` });
  } catch (error) {
    logger.error("Failed to toggle SMS:", error);
    res.status(500).json({ error: "Failed to update SMS settings" });
  }
});

export default router;
