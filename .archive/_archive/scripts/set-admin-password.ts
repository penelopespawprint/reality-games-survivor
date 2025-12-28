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

async function setAdminPassword() {
  console.log("\n=== Setting Admin Password ===\n");

  try {
    await prisma.$connect();
    console.log("✅ Database connection established\n");

    // Find admin@rgfl.com user
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@rgfl.com" }
    });

    if (!adminUser) {
      console.log("❌ admin@rgfl.com not found in database");
      console.log("Creating admin@rgfl.com...\n");

      // Hash password
      const hashedPassword = await bcrypt.hash("admin123", 10);

      // Create admin user
      const newAdmin = await prisma.user.create({
        data: {
          email: "admin@rgfl.com",
          name: "Admin User",
          password: hashedPassword,
          isAdmin: true,
        },
      });

      console.log(`✅ Created admin@rgfl.com`);
      console.log(`   ID: ${newAdmin.id}`);
      console.log(`   Email: ${newAdmin.email}`);
      console.log(`   Password: admin123`);
      console.log(`   isAdmin: ${newAdmin.isAdmin}\n`);

      // Auto-assign to Official League
      const officialLeague = await prisma.league.findFirst({
        where: {
          type: "OFFICIAL",
          status: { in: ["OPEN", "ACTIVE"] },
          currentPlayers: { lt: prisma.league.fields.maxPlayers },
        },
      });

      if (officialLeague) {
        await prisma.$transaction(async (tx) => {
          await tx.leagueMembership.create({
            data: {
              userId: newAdmin.id,
              leagueId: officialLeague.id,
              role: "MEMBER",
            },
          });

          await tx.league.update({
            where: { id: officialLeague.id },
            data: {
              currentPlayers: { increment: 1 },
              status:
                officialLeague.currentPlayers + 1 >= officialLeague.maxPlayers
                  ? "FULL"
                  : officialLeague.status,
            },
          });
        });
        console.log(`✅ Assigned to league: ${officialLeague.name}\n`);
      }

    } else {
      console.log(`📧 Found: ${adminUser.email}`);
      console.log(`   ID: ${adminUser.id}`);
      console.log(`   Current isAdmin: ${adminUser.isAdmin}\n`);

      // Hash new password
      const hashedPassword = await bcrypt.hash("admin123", 10);

      // Update password and ensure admin status
      const updated = await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          password: hashedPassword,
          isAdmin: true
        }
      });

      console.log(`✅ Updated admin@rgfl.com`);
      console.log(`   New password: admin123`);
      console.log(`   isAdmin: ${updated.isAdmin}\n`);

      // Verify password
      const isValid = await bcrypt.compare("admin123", updated.password!);
      console.log(`🔐 Password verification: ${isValid ? "✅ Valid" : "❌ Invalid"}\n`);
    }

    console.log(`✅ Admin credentials ready!\n`);
    console.log(`Login at: https://test.realitygamesfantasyleague.com`);
    console.log(`Email: admin@rgfl.com`);
    console.log(`Password: admin123\n`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminPassword();
