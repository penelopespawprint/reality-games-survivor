// @ts-nocheck
import { Router } from "express";
import { createLogger, logError } from "./logger.js";
const logger = createLogger("feedback");
import prisma from "./prisma.js";
import { authenticate, requireAdmin } from "./middleware.js";

const router = Router();

// Submit feedback (authenticated users)
router.post("/", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { surveyType, question, answer, rating, metadata } = req.body;

    if (!surveyType || !question) {
      return res.status(400).json({ error: "Survey type and question are required" });
    }

    if (!answer && !rating) {
      return res.status(400).json({ error: "Either answer or rating is required" });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId,
        surveyType,
        question,
        answer: answer || "",
        rating: rating || null,
        metadata: metadata || null
      }
    });

    res.json({ success: true, feedback });
  } catch (error) {
    logger.error("Error creating feedback:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

// Get all feedback (admin only)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { surveyType } = req.query;

    const feedback = await prisma.feedback.findMany({
      where: surveyType ? { surveyType: surveyType as any } : undefined,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(feedback);
  } catch (error) {
    logger.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// Get feedback stats (admin only)
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const stats = await prisma.feedback.groupBy({
      by: ["surveyType"],
      _count: {
        id: true
      },
      _avg: {
        rating: true
      }
    });

    const totalResponses = await prisma.feedback.count();

    res.json({
      totalResponses,
      byType: stats
    });
  } catch (error) {
    logger.error("Error fetching feedback stats:", error);
    res.status(500).json({ error: "Failed to fetch feedback stats" });
  }
});

// Check if user has already submitted a specific survey
router.get("/check/:surveyType", authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { surveyType } = req.params;

    const existing = await prisma.feedback.findFirst({
      where: {
        userId,
        surveyType: surveyType as any
      }
    });

    res.json({ hasSubmitted: !!existing });
  } catch (error) {
    logger.error("Error checking feedback:", error);
    res.status(500).json({ error: "Failed to check feedback" });
  }
});

export default router;
