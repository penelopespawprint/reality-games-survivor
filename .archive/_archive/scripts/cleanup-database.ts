import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting database cleanup...');

  // 1. Delete all non-admin users
  console.log('\n👥 Deleting test users...');
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        not: 'admin@rgfl.com'
      }
    }
  });
  console.log(`✅ Deleted ${deletedUsers.count} test users`);

  // 2. Remove duplicate castaways
  console.log('\n🏝️ Removing duplicate castaways...');

  // Delete the shorter name versions (keep the full names with quotes)
  const duplicatesToDelete = [
    'MC Chukwujekwu',
    'Annie Davis',
    'Jawan Pitts'
  ];

  for (const name of duplicatesToDelete) {
    const deleted = await prisma.castaway.deleteMany({
      where: { name }
    });
    if (deleted.count > 0) {
      console.log(`  ✅ Deleted duplicate: ${name}`);
    }
  }

  // Verify final counts
  const finalUserCount = await prisma.user.count();
  const finalCastawayCount = await prisma.castaway.count();

  console.log('\n📊 Final Counts:');
  console.log(`Users: ${finalUserCount} (should be 1)`);
  console.log(`Castaways: ${finalCastawayCount} (should be 18)`);

  if (finalUserCount !== 1) {
    console.warn('⚠️  Warning: Expected 1 user, got', finalUserCount);
  }
  if (finalCastawayCount !== 18) {
    console.warn('⚠️  Warning: Expected 18 castaways, got', finalCastawayCount);
  }

  console.log('\n✨ Cleanup complete!');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
