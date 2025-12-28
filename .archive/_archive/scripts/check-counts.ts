import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const castawayCount = await prisma.castaway.count();

  console.log('📊 Database Counts:');
  console.log(`Users: ${userCount}`);
  console.log(`Castaways: ${castawayCount}`);

  console.log('\n👥 All Users:');
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, isAdmin: true }
  });
  users.forEach(u => console.log(`  - ${u.name} (${u.email}) ${u.isAdmin ? '[ADMIN]' : ''}`));

  console.log('\n🏝️ All Castaways:');
  const castaways = await prisma.castaway.findMany({
    select: { id: true, name: true, tribe: true }
  });
  castaways.forEach(c => console.log(`  - ${c.name} (${c.tribe})`));
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
