const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function initializeDatabase() {
  try {
    console.log('🔧 Starting database initialization...');

    // Create a default league
    const league = await prisma.league.upsert({
      where: { code: 'RGFL2024' },
      update: {},
      create: {
        name: 'RGFL Survivor Fantasy League 2024',
        code: 'RGFL2024'
      }
    });

    console.log('✅ League created:', league.name);

    // Create castaways (Survivor 49 contestants)
    const castaways = [
      // Kele Tribe (Yellow)
      { name: 'Nicole Mazullo', tribe: 'Kele', occupation: 'Financial Crime Consultant', age: 26, hometown: 'Philadelphia, PA' },
      { name: 'Alex Moore', tribe: 'Kele', occupation: 'Political Comms Director', age: 26, hometown: 'Washington, DC' },
      { name: 'Annie Davis', tribe: 'Kele', occupation: 'Musician', age: 49, hometown: 'Austin, TX' },
      { name: 'Jake Latimer', tribe: 'Kele', occupation: 'Correctional Officer', age: 35, hometown: 'St. Albert, AB' },
      { name: 'Jeremiah Ing', tribe: 'Kele', occupation: 'Global Events Manager', age: 38, hometown: 'Toronto, ON' },
      { name: 'Sophi Balerdi', tribe: 'Kele', occupation: 'Entrepreneur', age: 27, hometown: 'Miami, FL' },
      // Hina Tribe (Blue)
      { name: 'Jason Treul', tribe: 'Hina', occupation: 'Law Clerk', age: 32, hometown: 'Santa Ana, CA' },
      { name: 'Kristina Mills', tribe: 'Hina', occupation: 'MBA Career Coach', age: 35, hometown: 'Edmond, OK' },
      { name: 'Matt Williams', tribe: 'Hina', occupation: 'Airport Ramp Agent', age: 52, hometown: 'St. George, UT' },
      { name: 'MC Chukwujekwu', tribe: 'Hina', occupation: 'Fitness Trainer', age: 29, hometown: 'San Diego, CA' },
      { name: 'Sophie Segreti', tribe: 'Hina', occupation: 'Strategy Associate', age: 31, hometown: 'New York, NY' },
      { name: 'Steven Ramm', tribe: 'Hina', occupation: 'Rocket Scientist', age: 35, hometown: 'Denver, CO' },
      // Uli Tribe (Red)
      { name: 'Jawan Pitts', tribe: 'Uli', occupation: 'Video Editor', age: 28, hometown: 'Los Angeles, CA' },
      { name: 'Nate Moore', tribe: 'Uli', occupation: 'Film Producer', age: 47, hometown: 'Hermosa Beach, CA' },
      { name: 'Rizo Velovic', tribe: 'Uli', occupation: 'Tech Sales', age: 25, hometown: 'Yonkers, NY' },
      { name: 'Sage Ahrens-Nichols', tribe: 'Uli', occupation: 'Clinical Social Worker', age: 30, hometown: 'Olympia, WA' },
      { name: 'Savannah Louie', tribe: 'Uli', occupation: 'Former Reporter', age: 31, hometown: 'Atlanta, GA' },
      { name: 'Shannon Fairweather', tribe: 'Uli', occupation: 'Wellness Specialist', age: 27, hometown: 'Boston, MA' }
    ];

    console.log('🏝️ Creating castaways...');
    for (const castaway of castaways) {
      await prisma.castaway.create({
        data: castaway
      }).catch(() => {
        // Castaway already exists, skip
      });
    }

    console.log(`✅ Created ${castaways.length} castaways`);

    // Create initial weeks
    const weeks = [
      { weekNumber: 1, isActive: false },
      { weekNumber: 2, isActive: false },
      { weekNumber: 3, isActive: true },
      { weekNumber: 4, isActive: false },
      { weekNumber: 5, isActive: false },
      { weekNumber: 6, isActive: false },
      { weekNumber: 7, isActive: false },
      { weekNumber: 8, isActive: false },
      { weekNumber: 9, isActive: false },
      { weekNumber: 10, isActive: false },
      { weekNumber: 11, isActive: false },
      { weekNumber: 12, isActive: false },
      { weekNumber: 13, isActive: false }
    ];

    console.log('📅 Creating weeks...');
    for (const week of weeks) {
      await prisma.week.create({
        data: week
      }).catch(() => {
        // Week already exists, skip
      });
    }

    console.log(`✅ Created ${weeks.length} weeks`);

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@rgfl.com' },
      update: {},
      create: {
        email: 'admin@rgfl.com',
        password: hashedPassword,
        name: 'RGFL Admin',
        isAdmin: true,
        leagueId: league.id
      }
    });

    console.log('✅ Admin user created:', adminUser.email);

    // Create sample regular user
    const userPassword = await bcrypt.hash('user123', 10);
    const sampleUser = await prisma.user.upsert({
      where: { email: 'user@rgfl.com' },
      update: {},
      create: {
        email: 'user@rgfl.com',
        password: userPassword,
        name: 'Sample User',
        isAdmin: false,
        leagueId: league.id
      }
    });

    console.log('✅ Sample user created:', sampleUser.email);

    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase().catch(console.error);
}

module.exports = initializeDatabase;
