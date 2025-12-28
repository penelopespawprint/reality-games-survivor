/**
 * Seed script for scoring rules
 * Contains 100+ scoring rules organized by category
 * Run with: npx tsx prisma/seed-scoring-rules.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Scoring rules organized by category
const SCORING_RULES = [
  // Pre-Merge Team (1-8)
  { category: "Pre-Merge Team", name: "Wins Team Reward", points: 1 },
  { category: "Pre-Merge Team", name: "Wins Team Immunity", points: 2 },
  { category: "Pre-Merge Team", name: "Loses Team Reward", points: -1 },
  { category: "Pre-Merge Team", name: "Loses Team Immunity", points: -2 },
  { category: "Pre-Merge Team", name: "MVP of Team Reward", points: 2 },
  { category: "Pre-Merge Team", name: "MVP of Team Immunity", points: 3 },
  { category: "Pre-Merge Team", name: "Puzzle Choker on Team Reward", points: -2 },
  { category: "Pre-Merge Team", name: "Puzzle Choker on Team Immunity", points: -3 },

  // Pre-Merge Tribal (9-22)
  { category: "Pre-Merge Tribal", name: "Voted Out Pre-Merge", points: -5 },
  { category: "Pre-Merge Tribal", name: "Survives Tribal Council", points: 1 },
  { category: "Pre-Merge Tribal", name: "Votes with Majority", points: 1 },
  { category: "Pre-Merge Tribal", name: "Votes Incorrectly", points: -1 },
  { category: "Pre-Merge Tribal", name: "Receives Vote (not eliminated)", points: -1 },
  { category: "Pre-Merge Tribal", name: "Does Not Receive Any Votes", points: 2 },
  { category: "Pre-Merge Tribal", name: "Attends Tribal (not voted out)", points: 1 },
  { category: "Pre-Merge Tribal", name: "Tribal blindside (voting majority)", points: 2 },
  { category: "Pre-Merge Tribal", name: "Tribal blindside (victim)", points: -2 },
  { category: "Pre-Merge Tribal", name: "Receives 0 Votes at Elimination", points: 3 },
  { category: "Pre-Merge Tribal", name: "Rock Draw Survivor", points: 2 },
  { category: "Pre-Merge Tribal", name: "Rock Draw Eliminated", points: -3 },
  { category: "Pre-Merge Tribal", name: "Fire Making Winner", points: 3 },
  { category: "Pre-Merge Tribal", name: "Fire Making Loser", points: -3 },

  // Post-Merge Challenges (23-34)
  { category: "Post-Merge Challenges", name: "Wins Individual Immunity", points: 5 },
  { category: "Post-Merge Challenges", name: "Wins Individual Reward", points: 3 },
  { category: "Post-Merge Challenges", name: "Second Place Individual Immunity", points: 2 },
  { category: "Post-Merge Challenges", name: "First Out Individual Immunity", points: -2 },
  { category: "Post-Merge Challenges", name: "First Out Individual Reward", points: -1 },
  { category: "Post-Merge Challenges", name: "Wins Food/Loved Ones Reward", points: 4 },
  { category: "Post-Merge Challenges", name: "Shares Reward with Others", points: 2 },
  { category: "Post-Merge Challenges", name: "Picked for Reward by Winner", points: 1 },
  { category: "Post-Merge Challenges", name: "Not Picked for Reward", points: -1 },
  { category: "Post-Merge Challenges", name: "Wins Auction Item", points: 1 },
  { category: "Post-Merge Challenges", name: "Medical Attention Required", points: -2 },
  { category: "Post-Merge Challenges", name: "Quits Challenge", points: -3 },

  // Post-Merge Tribal (35-50)
  { category: "Post-Merge Tribal", name: "Voted Out Post-Merge", points: -3 },
  { category: "Post-Merge Tribal", name: "Makes Merge", points: 5 },
  { category: "Post-Merge Tribal", name: "Survives Post-Merge Tribal", points: 2 },
  { category: "Post-Merge Tribal", name: "Votes with Majority Post-Merge", points: 2 },
  { category: "Post-Merge Tribal", name: "Votes Incorrectly Post-Merge", points: -2 },
  { category: "Post-Merge Tribal", name: "Receives Vote Post-Merge (not out)", points: -2 },
  { category: "Post-Merge Tribal", name: "Zero Votes Post-Merge Tribal", points: 3 },
  { category: "Post-Merge Tribal", name: "Orchestrates Vote", points: 4 },
  { category: "Post-Merge Tribal", name: "Blindsided Victim", points: -4 },
  { category: "Post-Merge Tribal", name: "Blindside Orchestrator", points: 4 },
  { category: "Post-Merge Tribal", name: "Split Vote Participant", points: 1 },
  { category: "Post-Merge Tribal", name: "Flips on Alliance", points: 3 },
  { category: "Post-Merge Tribal", name: "Idol Nullifier Used on Them", points: -3 },
  { category: "Post-Merge Tribal", name: "Shot in the Dark Success", points: 5 },
  { category: "Post-Merge Tribal", name: "Shot in the Dark Fail", points: -2 },
  { category: "Post-Merge Tribal", name: "Jury Member", points: 3 },

  // Advantages (51-70)
  { category: "Advantages", name: "Finds Hidden Immunity Idol", points: 4 },
  { category: "Advantages", name: "Plays Idol Successfully", points: 5 },
  { category: "Advantages", name: "Plays Idol Unsuccessfully", points: -2 },
  { category: "Advantages", name: "Plays Idol for Another", points: 3 },
  { category: "Advantages", name: "Idol Played for Them", points: 2 },
  { category: "Advantages", name: "Holds Idol at Elimination", points: -5 },
  { category: "Advantages", name: "Finds Advantage", points: 3 },
  { category: "Advantages", name: "Plays Advantage Successfully", points: 4 },
  { category: "Advantages", name: "Plays Advantage Unsuccessfully", points: -2 },
  { category: "Advantages", name: "Wins Advantage at Auction", points: 2 },
  { category: "Advantages", name: "Steals Vote", points: 3 },
  { category: "Advantages", name: "Extra Vote Used", points: 2 },
  { category: "Advantages", name: "Immunity Idol Nullifier Used", points: 4 },
  { category: "Advantages", name: "Advantage Amulet Activated", points: 3 },
  { category: "Advantages", name: "Knowledge is Power Used", points: 4 },
  { category: "Advantages", name: "Knowledge is Power Blocked", points: -2 },
  { category: "Advantages", name: "Bank Your Vote Used", points: 2 },
  { category: "Advantages", name: "Safety Without Power Used", points: 3 },
  { category: "Advantages", name: "Beware Advantage Curse", points: -2 },
  { category: "Advantages", name: "Loses Vote Due to Advantage", points: -2 },

  // Idols Extended (71-80)
  { category: "Idols", name: "Idol Rehidden Found", points: 4 },
  { category: "Idols", name: "Idol Clue Found", points: 2 },
  { category: "Idols", name: "Shares Idol Info", points: 1 },
  { category: "Idols", name: "Fake Idol Made", points: 2 },
  { category: "Idols", name: "Fake Idol Played on Them", points: -1 },
  { category: "Idols", name: "Fake Idol Causes Chaos", points: 3 },
  { category: "Idols", name: "Idol Expires Unused", points: -3 },
  { category: "Idols", name: "Multiple Idols Held", points: 2 },
  { category: "Idols", name: "Idol Traded/Given", points: 2 },
  { category: "Idols", name: "Idol Nullified", points: -4 },

  // Random Events (81-95)
  { category: "Random", name: "Shown Crying", points: -1 },
  { category: "Random", name: "Gets into Argument", points: -1 },
  { category: "Random", name: "Catches Fish", points: 1 },
  { category: "Random", name: "Makes Fire (first)", points: 2 },
  { category: "Random", name: "Finds Food/Fruit", points: 1 },
  { category: "Random", name: "Gets Sick/Injured", points: -2 },
  { category: "Random", name: "Makes Alliance", points: 2 },
  { category: "Random", name: "Betrays Alliance", points: 2 },
  { category: "Random", name: "Gets Confessional", points: 1 },
  { category: "Random", name: "Episode Title Quote", points: 2 },
  { category: "Random", name: "Talks to Camera First", points: 1 },
  { category: "Random", name: "Idol Hunting Shown", points: 1 },
  { category: "Random", name: "Camp Life Positive", points: 1 },
  { category: "Random", name: "Camp Life Negative", points: -1 },
  { category: "Random", name: "Swap Screwed", points: -2 },

  // Final Phase (96-110)
  { category: "Final", name: "Makes Final 3", points: 10 },
  { category: "Final", name: "Makes Final 2", points: 12 },
  { category: "Final", name: "Sole Survivor", points: 25 },
  { category: "Final", name: "Runner Up", points: 10 },
  { category: "Final", name: "Third Place", points: 5 },
  { category: "Final", name: "Gets Jury Vote", points: 2 },
  { category: "Final", name: "Zero Jury Votes", points: -5 },
  { category: "Final", name: "Fire Making Final 4 Win", points: 5 },
  { category: "Final", name: "Fire Making Final 4 Loss", points: -3 },
  { category: "Final", name: "Wins Final Immunity", points: 5 },
  { category: "Final", name: "Makes Fire at FTC", points: 3 },
  { category: "Final", name: "Strong FTC Performance", points: 3 },
  { category: "Final", name: "Weak FTC Performance", points: -2 },
  { category: "Final", name: "Eliminated at Final 4", points: -2 },
  { category: "Final", name: "Eliminated at Final 5", points: -1 },
];

async function seedScoringRules() {
  console.log("🏆 Seeding scoring rules...");

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < SCORING_RULES.length; i++) {
    const rule = SCORING_RULES[i];

    try {
      await prisma.scoringRule.upsert({
        where: {
          category_name: {
            category: rule.category,
            name: rule.name,
          },
        },
        update: {
          points: rule.points,
          sortOrder: i,
        },
        create: {
          category: rule.category,
          name: rule.name,
          points: rule.points,
          sortOrder: i,
          isActive: true,
        },
      });
      created++;
    } catch (error) {
      console.error(`Failed to create rule: ${rule.name}`, error);
      skipped++;
    }
  }

  console.log(`✅ Scoring rules seeded: ${created} created/updated, ${skipped} skipped`);
  console.log(`📊 Total rules: ${SCORING_RULES.length}`);

  // Summary by category
  const categories = [...new Set(SCORING_RULES.map(r => r.category))];
  console.log("\n📋 Rules by category:");
  for (const cat of categories) {
    const count = SCORING_RULES.filter(r => r.category === cat).length;
    console.log(`   ${cat}: ${count} rules`);
  }
}

seedScoringRules()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
