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

async function createAdminUser(email: string, name: string, password: string) {
  console.log(`\n🔧 Creating admin user: ${email}...`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`⚠️  User ${email} already exists`);

    // Update to admin if not already
    if (!existingUser.isAdmin) {
      const updated = await prisma.user.update({
        where: { id: existingUser.id },
        data: { isAdmin: true }
      });
      console.log(`✅ Updated ${email} to admin status`);
      return updated;
    } else {
      console.log(`✅ ${email} is already an admin`);
      return existingUser;
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create admin user
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      isAdmin: true,
    },
  });

  console.log(`✅ Admin user created successfully!`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   ID: ${user.id}`);

  // Auto-assign to Official League
  console.log(`\n📋 Auto-assigning to Official League...`);

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
          userId: user.id,
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

    console.log(`✅ Assigned to Official League: ${officialLeague.name}`);
  } else {
    console.log(`⚠️  No available Official League found`);
  }

  return user;
}

async function main() {
  console.log("\n=== Creating Production Admin Users ===");
  console.log(`Target: rgfl_survivor_ml database\n`);

  try {
    // Test connection
    await prisma.$connect();
    console.log("✅ Database connection established\n");

    // Create multiple admin users
    // You can customize these credentials
    const admins = [
      {
        email: "richard@realitygamesfantasyleague.com",
        name: "Richard (Admin)",
        password: "SecureAdmin2024!"
      }
      // Add more admins here if needed
      // {
      //   email: "another@example.com",
      //   name: "Another Admin",
      //   password: "AnotherSecurePassword!"
      // }
    ];

    for (const admin of admins) {
      await createAdminUser(admin.email, admin.name, admin.password);
    }

    console.log(`\n✅ All admin users created successfully!\n`);

  } catch (error) {
    console.error("❌ Error creating admin users:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
