import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting multi-league database reset and seed...\n');

  // Hash password once for all users
  const passwordHash = await bcrypt.hash('password', 10);

  // Step 1: Create Users
  console.log('👥 Creating users...');
  const users = await Promise.all([
    // Admins
    prisma.user.create({
      data: {
        email: 'admin1@rgfl.com',
        name: 'Admin1',
        password: passwordHash,
        isAdmin: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'admin2@rgfl.com',
        name: 'Admin2',
        password: passwordHash,
        isAdmin: true,
      },
    }),
    // League Creators
    prisma.user.create({
      data: {
        email: 'leaguecreator1@rgfl.com',
        name: 'LeagueCreator1',
        password: passwordHash,
        isAdmin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'leaguecreator2@rgfl.com',
        name: 'LeagueCreator2',
        password: passwordHash,
        isAdmin: false,
      },
    }),
    // League Players
    prisma.user.create({
      data: {
        email: 'leagueplayer1@rgfl.com',
        name: 'LeaguePlayer1',
        password: passwordHash,
        isAdmin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'leagueplayer2@rgfl.com',
        name: 'LeaguePlayer2',
        password: passwordHash,
        isAdmin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'leagueplayer3@rgfl.com',
        name: 'LeaguePlayer3',
        password: passwordHash,
        isAdmin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'leagueplayer4@rgfl.com',
        name: 'LeaguePlayer4',
        password: passwordHash,
        isAdmin: false,
      },
    }),
    // Global Players (play in multiple leagues)
    prisma.user.create({
      data: {
        email: 'globalplayer1@rgfl.com',
        name: 'GlobalPlayer1',
        password: passwordHash,
        isAdmin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'globalplayer2@rgfl.com',
        name: 'GlobalPlayer2',
        password: passwordHash,
        isAdmin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'globalplayer3@rgfl.com',
        name: 'GlobalPlayer3',
        password: passwordHash,
        isAdmin: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'globalplayer4@rgfl.com',
        name: 'GlobalPlayer4',
        password: passwordHash,
        isAdmin: false,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users\n`);

  // Step 2: Create Leagues
  console.log('🏆 Creating leagues...');

  const officialLeague = await prisma.league.create({
    data: {
      name: 'Official Borneo League',
      code: 'BORNEO-2025',
      type: 'OFFICIAL',
      description: 'The official RGFL Survivor league for Borneo season',
      maxPlayers: 18,
      currentPlayers: 0,
      status: 'ACTIVE',
      draftStatus: 'COMPLETED',
      picksPerUser: 2,
    },
  });

  const customLeague1 = await prisma.league.create({
    data: {
      name: 'West Coast Warriors',
      code: 'WCW-2025',
      type: 'CUSTOM',
      description: 'Private league for West Coast fans',
      isPasswordProtected: true,
      password: await bcrypt.hash('warriors', 10),
      maxPlayers: 12,
      currentPlayers: 0,
      status: 'ACTIVE',
      draftStatus: 'COMPLETED',
      picksPerUser: 2,
    },
  });

  const customLeague2 = await prisma.league.create({
    data: {
      name: 'East Coast Challengers',
      code: 'ECC-2025',
      type: 'CUSTOM',
      description: 'Competitive league for experienced players',
      isPasswordProtected: false,
      maxPlayers: 10,
      currentPlayers: 0,
      status: 'ACTIVE',
      draftStatus: 'COMPLETED',
      picksPerUser: 2,
    },
  });

  const customLeague3 = await prisma.league.create({
    data: {
      name: 'Rookies United',
      code: 'ROOKIE-2025',
      type: 'CUSTOM',
      description: 'Beginner-friendly league',
      isPasswordProtected: false,
      maxPlayers: 8,
      currentPlayers: 0,
      status: 'OPEN',
      draftStatus: 'PENDING',
      picksPerUser: 2,
    },
  });

  console.log(`✅ Created 4 leagues\n`);

  // Step 3: Create League Memberships
  console.log('🤝 Creating league memberships...');

  // Official League: Admin1, LeagueCreator1, LeaguePlayer1-4, GlobalPlayer1-4
  await Promise.all([
    prisma.leagueMembership.create({ data: { userId: users[0].id, leagueId: officialLeague.id, role: 'ADMIN' } }),
    prisma.leagueMembership.create({ data: { userId: users[2].id, leagueId: officialLeague.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[4].id, leagueId: officialLeague.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[5].id, leagueId: officialLeague.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[6].id, leagueId: officialLeague.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[7].id, leagueId: officialLeague.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[8].id, leagueId: officialLeague.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[9].id, leagueId: officialLeague.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[10].id, leagueId: officialLeague.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[11].id, leagueId: officialLeague.id, role: 'MEMBER' } }),
  ]);

  // Custom League 1: Admin2, LeagueCreator1, GlobalPlayer1-3
  await Promise.all([
    prisma.leagueMembership.create({ data: { userId: users[1].id, leagueId: customLeague1.id, role: 'ADMIN' } }),
    prisma.leagueMembership.create({ data: { userId: users[2].id, leagueId: customLeague1.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[8].id, leagueId: customLeague1.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[9].id, leagueId: customLeague1.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[10].id, leagueId: customLeague1.id, role: 'MEMBER' } }),
  ]);

  // Custom League 2: LeagueCreator2, LeaguePlayer1-2, GlobalPlayer2-4
  await Promise.all([
    prisma.leagueMembership.create({ data: { userId: users[3].id, leagueId: customLeague2.id, role: 'ADMIN' } }),
    prisma.leagueMembership.create({ data: { userId: users[4].id, leagueId: customLeague2.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[5].id, leagueId: customLeague2.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[9].id, leagueId: customLeague2.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[10].id, leagueId: customLeague2.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[11].id, leagueId: customLeague2.id, role: 'MEMBER' } }),
  ]);

  // Custom League 3 (Rookies): LeaguePlayer3-4, GlobalPlayer4
  await Promise.all([
    prisma.leagueMembership.create({ data: { userId: users[6].id, leagueId: customLeague3.id, role: 'ADMIN' } }),
    prisma.leagueMembership.create({ data: { userId: users[7].id, leagueId: customLeague3.id, role: 'MEMBER' } }),
    prisma.leagueMembership.create({ data: { userId: users[11].id, leagueId: customLeague3.id, role: 'MEMBER' } }),
  ]);

  // Update league member counts
  await prisma.league.update({ where: { id: officialLeague.id }, data: { currentPlayers: 10 } });
  await prisma.league.update({ where: { id: customLeague1.id }, data: { currentPlayers: 5 } });
  await prisma.league.update({ where: { id: customLeague2.id }, data: { currentPlayers: 6 } });
  await prisma.league.update({ where: { id: customLeague3.id }, data: { currentPlayers: 3 } });

  console.log(`✅ Created league memberships\n`);

  // Step 4: Create Castaways
  console.log('🏝️ Creating castaways...');

  const castaways = await Promise.all([
    prisma.castaway.create({ data: { name: 'Steven Ramm', number: 1, tribe: 'Solewa', eliminated: false } }),
    prisma.castaway.create({ data: { name: 'Sage Ahrens-Nichols', number: 2, tribe: 'Solewa', eliminated: false } }),
    prisma.castaway.create({ data: { name: 'Jason Treul', number: 3, tribe: 'Solewa', eliminated: false } }),
    prisma.castaway.create({ data: { name: 'Kristina Mills', number: 4, tribe: 'Solewa', eliminated: false } }),
    prisma.castaway.create({ data: { name: 'Rizo Velovic', number: 5, tribe: 'Solewa', eliminated: false } }),
    prisma.castaway.create({ data: { name: 'Sophie Segreti', number: 6, tribe: 'Solewa', eliminated: false } }),
    prisma.castaway.create({ data: { name: 'Sophi Balerdi', number: 7, tribe: 'Solewa', eliminated: false } }),
    prisma.castaway.create({ data: { name: 'Savannah Louie', number: 8, tribe: 'Solewa', eliminated: false } }),
    prisma.castaway.create({ data: { name: 'Nicole Mazullo', number: 9, tribe: 'Kele', eliminated: true, eliminatedWeek: 1 } }),
    prisma.castaway.create({ data: { name: 'Kimberly "Annie" Davis', number: 10, tribe: 'Hina', eliminated: true, eliminatedWeek: 2 } }),
    prisma.castaway.create({ data: { name: 'Matt Williams', number: 11, tribe: 'Uli', eliminated: true, eliminatedWeek: 3 } }),
    prisma.castaway.create({ data: { name: 'Jake Latimer', number: 12, tribe: 'Kele', eliminated: true, eliminatedWeek: 3 } }),
    prisma.castaway.create({ data: { name: 'Jeremiah Ing', number: 13, tribe: 'Hina', eliminated: true, eliminatedWeek: 4 } }),
    prisma.castaway.create({ data: { name: 'Shannon Fairweather', number: 14, tribe: 'Uli', eliminated: true, eliminatedWeek: 6 } }),
    prisma.castaway.create({ data: { name: 'Nate Moore', number: 15, tribe: 'Kele', eliminated: true, eliminatedWeek: 7 } }),
    prisma.castaway.create({ data: { name: 'Michelle "MC" Chukwujekwu', number: 16, tribe: 'Hina', eliminated: true, eliminatedWeek: 8 } }),
    prisma.castaway.create({ data: { name: 'Alex Moore', number: 17, tribe: 'Uli', eliminated: true, eliminatedWeek: 9 } }),
    prisma.castaway.create({ data: { name: 'Jawan Pitts', number: 18, tribe: 'Solewa', eliminated: true, eliminatedWeek: 10 } }),
  ]);

  console.log(`✅ Created ${castaways.length} castaways\n`);

  // Step 5: Create Weeks
  console.log('📅 Creating week schedule...');

  const baseDate = new Date('2025-09-04');
  const weeks = [];

  for (let i = 1; i <= 13; i++) {
    const openDate = new Date(baseDate);
    openDate.setDate(baseDate.getDate() + (i - 1) * 7);

    const closeDate = new Date(openDate);
    closeDate.setDate(openDate.getDate() + 6);

    const week = await prisma.week.create({
      data: {
        weekNumber: i,
        isActive: i === 11, // Week 11 is currently active
        picksOpenAt: openDate,
        picksCloseAt: closeDate,
      },
    });
    weeks.push(week);
  }

  console.log(`✅ Created ${weeks.length} weeks\n`);

  // Step 6: Create Weekly Results (scoring data)
  console.log('📊 Creating weekly results...');

  const weeklyScores = [
    // Week 1
    { week: 1, castawayId: castaways[0].id, points: 15 },
    { week: 1, castawayId: castaways[1].id, points: 12 },
    { week: 1, castawayId: castaways[2].id, points: 18 },
    { week: 1, castawayId: castaways[3].id, points: 10 },
    { week: 1, castawayId: castaways[4].id, points: 14 },
    { week: 1, castawayId: castaways[5].id, points: 16 },
    { week: 1, castawayId: castaways[6].id, points: 11 },
    { week: 1, castawayId: castaways[7].id, points: 13 },
    { week: 1, castawayId: castaways[8].id, points: 0 }, // Nicole eliminated
    { week: 1, castawayId: castaways[9].id, points: 8 },
    { week: 1, castawayId: castaways[10].id, points: 9 },
    { week: 1, castawayId: castaways[11].id, points: 12 },
    { week: 1, castawayId: castaways[12].id, points: 10 },
    { week: 1, castawayId: castaways[13].id, points: 11 },
    { week: 1, castawayId: castaways[14].id, points: 14 },
    { week: 1, castawayId: castaways[15].id, points: 13 },
    { week: 1, castawayId: castaways[16].id, points: 15 },
    { week: 1, castawayId: castaways[17].id, points: 12 },
    // Week 2
    { week: 2, castawayId: castaways[0].id, points: 14 },
    { week: 2, castawayId: castaways[1].id, points: 16 },
    { week: 2, castawayId: castaways[2].id, points: 12 },
    { week: 2, castawayId: castaways[3].id, points: 15 },
    { week: 2, castawayId: castaways[4].id, points: 13 },
    { week: 2, castawayId: castaways[5].id, points: 11 },
    { week: 2, castawayId: castaways[6].id, points: 17 },
    { week: 2, castawayId: castaways[7].id, points: 10 },
    { week: 2, castawayId: castaways[9].id, points: 0 }, // Annie eliminated
    { week: 2, castawayId: castaways[10].id, points: 12 },
    { week: 2, castawayId: castaways[11].id, points: 14 },
    { week: 2, castawayId: castaways[12].id, points: 11 },
    { week: 2, castawayId: castaways[13].id, points: 13 },
    { week: 2, castawayId: castaways[14].id, points: 15 },
    { week: 2, castawayId: castaways[15].id, points: 12 },
    { week: 2, castawayId: castaways[16].id, points: 14 },
    { week: 2, castawayId: castaways[17].id, points: 16 },
  ];

  for (const score of weeklyScores) {
    await prisma.weeklyResult.create({
      data: {
        weekNumber: score.week,
        castawayId: score.castawayId,
        points: score.points,
      },
    });
  }

  console.log(`✅ Created ${weeklyScores.length} weekly results\n`);

  // Step 7: Create Draft Picks for Official League
  console.log('🎯 Creating draft picks...');

  const officialMembers = users.slice(0, 2).concat(users.slice(2, 12)); // First 10 users (Admin1 + 9 others)
  let pickNumber = 1;

  // Round 1: 9 picks (one per member)
  for (let i = 0; i < 9; i++) {
    await prisma.draftPick.create({
      data: {
        userId: officialMembers[i].id,
        castawayId: castaways[pickNumber - 1].id,
        leagueId: officialLeague.id,
        round: 1,
        pickNumber,
      },
    });
    pickNumber++;
  }

  // Round 2: 9 picks (snake draft - reverse order)
  for (let i = 8; i >= 0; i--) {
    await prisma.draftPick.create({
      data: {
        userId: officialMembers[i].id,
        castawayId: castaways[pickNumber - 1].id,
        leagueId: officialLeague.id,
        round: 2,
        pickNumber,
      },
    });
    pickNumber++;
  }

  console.log(`✅ Created draft picks for Official League (${pickNumber - 1} picks)\n`);

  // Step 8: Create some sample picks for week 1 and 2
  console.log('📝 Creating sample weekly picks...');

  let pickCount = 0;
  for (let weekNum = 1; weekNum <= 2; weekNum++) {
    const week = weeks[weekNum - 1];
    // Official League picks (10 members, each picks a different castaway)
    for (let i = 0; i < Math.min(10, castaways.length); i++) {
      await prisma.pick.create({
        data: {
          userId: officialMembers[i].id,
          castawayId: castaways[i + weekNum - 1].id, // Vary picks by week
          weekNumber: weekNum,
          weekId: week.id,
          leagueId: officialLeague.id,
          locked: true,
          submittedAt: new Date(week.picksCloseAt!.getTime() - 86400000), // 1 day before close
        },
      });
      pickCount++;
    }
  }

  console.log(`✅ Created ${pickCount} sample picks\n`);

  // Step 9: Calculate and create scores for weeks with results
  console.log('🏅 Calculating user scores...');

  for (let weekNum = 1; weekNum <= 2; weekNum++) {
    const week = weeks[weekNum - 1];

    for (const member of officialMembers) {
      const userPick = await prisma.pick.findFirst({
        where: {
          userId: member.id,
          weekNumber: weekNum,
          leagueId: officialLeague.id,
        },
      });

      if (userPick) {
        const weeklyResult = await prisma.weeklyResult.findFirst({
          where: {
            weekNumber: weekNum,
            castawayId: userPick.castawayId,
          },
        });

        if (weeklyResult) {
          await prisma.score.create({
            data: {
              userId: member.id,
              weekId: week.id,
              leagueId: officialLeague.id,
              points: weeklyResult.points,
            },
          });
        }
      }
    }
  }

  console.log(`✅ Created user scores\n`);

  console.log('✨ Database reset and seed complete!\n');
  console.log('📋 Summary:');
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Leagues: 4 (1 Official, 3 Custom)`);
  console.log(`   - Castaways: ${castaways.length}`);
  console.log(`   - Weeks: ${weeks.length}`);
  console.log(`   - Active Week: 11`);
  console.log(`\n🔑 All users have password: "password"`);
  console.log('\n👤 User Accounts:');
  console.log('   Admins: admin1@rgfl.com, admin2@rgfl.com');
  console.log('   League Creators: leaguecreator1@rgfl.com, leaguecreator2@rgfl.com');
  console.log('   League Players: leagueplayer1-4@rgfl.com');
  console.log('   Global Players: globalplayer1-4@rgfl.com (in multiple leagues)');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
