import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetSeason() {
  console.log("🔄 Starting season reset...\n");

  try {
    // 1. Delete all non-admin user data
    console.log("1️⃣ Clearing user data...");

    // Get all non-admin user IDs
    const nonAdminUsers = await prisma.user.findMany({
      where: { isAdmin: false },
      select: { id: true }
    });
    const nonAdminIds = nonAdminUsers.map(u => u.id);

    // Delete related data
    await prisma.score.deleteMany({ where: { userId: { in: nonAdminIds } } });
    await prisma.pick.deleteMany({ where: { userId: { in: nonAdminIds } } });
    await prisma.draftPick.deleteMany({ where: { userId: { in: nonAdminIds } } });
    await prisma.ranking.deleteMany({ where: { userId: { in: nonAdminIds } } });

    // Delete non-admin users
    await prisma.user.deleteMany({ where: { isAdmin: false } });
    console.log(`   ✓ Deleted ${nonAdminIds.length} non-admin users and their data\n`);

    // 2. Clear all weeks and scores
    console.log("2️⃣ Clearing weeks and scores...");
    await prisma.score.deleteMany({});
    await prisma.pick.deleteMany({});
    await prisma.week.deleteMany({});
    console.log("   ✓ Cleared all weeks and scores\n");

    // 3. Reset league draft status
    console.log("3️⃣ Resetting league draft status...");
    const league = await prisma.league.findFirst();
    if (league) {
      await prisma.league.update({
        where: { id: league.id },
        data: {
          draftStatus: "PENDING",
          draftRunAt: null,
          rankingLockAt: null
        }
      });
      console.log("   ✓ Draft status set to PENDING (unlocked)\n");
    }

    // 4. Reset castaways (eliminate none, keep all data)
    console.log("4️⃣ Resetting castaways...");
    const castawayCount = await prisma.castaway.count();
    await prisma.castaway.updateMany({
      data: { eliminated: false }
    });
    console.log(`   ✓ Reset ${castawayCount} castaways (all active)\n`);

    // 5. Verify admin user exists
    console.log("5️⃣ Verifying admin user...");
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@rgfl.com" }
    });
    if (adminUser) {
      console.log(`   ✓ Admin user exists: ${adminUser.email}\n`);
    } else {
      console.log("   ⚠️ WARNING: admin@rgfl.com not found!\n");
    }

    console.log("\n✅ Season reset complete!");
    console.log("\n📋 Summary:");
    console.log("   • Draft status: PENDING (unlocked)");
    console.log("   • Admin user: admin@rgfl.com (preserved)");
    console.log("   • Non-admin users: deleted (ready for new signups)");
    console.log(`   • Castaways: ${castawayCount} (all active)`);
    console.log("   • Weeks: 0 (cleared)");
    console.log("   • Picks: 0 (cleared)");
    console.log("   • Scores: 0 (cleared)");
    console.log("   • Rankings: 0 (cleared)");

  } catch (error) {
    console.error("❌ Error resetting season:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetSeason();
