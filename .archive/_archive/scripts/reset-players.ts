import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting database cleanup...');

  // Delete all picks, scores, draft picks, and rankings
  console.log('Deleting picks...');
  await prisma.pick.deleteMany({});

  console.log('Deleting scores...');
  await prisma.score.deleteMany({});

  console.log('Deleting draft picks...');
  await prisma.draftPick.deleteMany({});

  console.log('Deleting rankings...');
  await prisma.ranking.deleteMany({});

  console.log('Deleting weekly results...');
  await prisma.weeklyResult.deleteMany({});

  // Delete all users except admin@rgfl.com
  console.log('Deleting non-admin users...');
  await prisma.user.deleteMany({
    where: {
      email: {
        not: 'admin@rgfl.com'
      }
    }
  });

  console.log('✅ Database cleaned');

  // Update castaways with Survivor 49 cast
  console.log('🏝️ Deleting old castaways...');
  await prisma.castaway.deleteMany({});

  const survivor49Cast = [
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

  console.log('Creating Survivor 49 castaways...');
  for (const castaway of survivor49Cast) {
    await prisma.castaway.create({ data: castaway });
  }

  console.log(`✅ Created ${survivor49Cast.length} castaways`);
  console.log('🎉 Reset completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
