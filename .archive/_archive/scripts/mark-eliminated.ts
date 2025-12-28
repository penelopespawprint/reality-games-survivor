import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markEliminated() {
  try {
    console.log('Marking castaways as eliminated...\n');

    // Mark Nicole Mazullo as eliminated in Week 1
    await prisma.castaway.updateMany({
      where: { name: 'Nicole Mazullo' },
      data: {
        eliminated: true,
        eliminatedWeek: 1
      }
    });
    console.log(`✅ Nicole Mazullo - eliminated: true, week: 1`);

    // Mark Annie Davis as eliminated in Week 2
    await prisma.castaway.updateMany({
      where: { name: 'Annie Davis' },
      data: {
        eliminated: true,
        eliminatedWeek: 2
      }
    });
    console.log(`✅ Annie Davis - eliminated: true, week: 2`);

    console.log('\n✅ Successfully marked castaways as eliminated');
  } catch (error) {
    console.error('❌ Error marking castaways as eliminated:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

markEliminated();
