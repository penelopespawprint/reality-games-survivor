#!/usr/bin/env tsx
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const DATABASE_URL = "postgresql://rgfl_survivor_ml_user:yhyJlseYWgor248l8jcb70hFMsdoLB1K@dpg-d4kbb5k9c44c73erlpp0-a.oregon-postgres.render.com/rgfl_survivor_ml?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function verifyAdmin() {
  console.log("\n=== Verifying Production Admin Users ===\n");

  try {
    await prisma.$connect();

    // Get all admin users
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        password: true,
        leagueMemberships: {
          include: {
            league: {
              select: { name: true, type: true }
            }
          }
        }
      }
    });

    console.log(`Found ${admins.length} admin user(s):\n`);

    for (const admin of admins) {
      console.log(`📧 Email: ${admin.email}`);
      console.log(`👤 Name: ${admin.name}`);
      console.log(`🆔 ID: ${admin.id}`);
      console.log(`📅 Created: ${admin.createdAt.toISOString()}`);
      console.log(`🔑 Has Password: ${admin.password ? 'Yes' : 'No'}`);
      console.log(`🏆 Leagues: ${admin.leagueMemberships.map(m => m.league.name).join(', ') || 'None'}`);

      // Test password verification (for the admin we just created)
      if (admin.email === 'richard@realitygamesfantasyleague.com' && admin.password) {
        const isValid = await bcrypt.compare('SecureAdmin2024!', admin.password);
        console.log(`🔐 Password Test: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      }

      console.log('');
    }

    console.log(`\n✅ Verification complete!\n`);

  } catch (error) {
    console.error("❌ Error verifying admins:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdmin();
