#!/usr/bin/env tsx
// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createAdmin() {
  console.log("\n=== Create Admin User ===\n");

  const email = await question("Email: ");
  const name = await question("Name: ");
  const password = await question("Password: ");

  if (!email || !name || !password) {
    console.error("❌ All fields are required");
    process.exit(1);
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.error(`❌ User with email ${email} already exists`);
    process.exit(1);
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

  console.log(`\n✅ Admin user created successfully!`);
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
              ? "CLOSED"
              : officialLeague.status,
        },
      });
    });

    console.log(`✅ Assigned to Official League: ${officialLeague.name}`);
  } else {
    console.log(`⚠️  No available Official League found`);
  }

  console.log(`\n✅ Setup complete!\n`);
  process.exit(0);
}

createAdmin().catch((error) => {
  console.error("❌ Error creating admin:", error);
  process.exit(1);
});
