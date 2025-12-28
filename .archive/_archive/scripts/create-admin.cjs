const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const { ADMIN_LEAGUE_CODE = 'RGFL2024', ADMIN_LEAGUE_NAME = 'RGFL Survivor Fantasy League 2024' } = process.env;

function collectAdminEnv() {
  const suffixes = new Set();

  for (const key of Object.keys(process.env)) {
    const match = key.match(/^ADMIN_EMAIL(_[A-Za-z0-9]+)?$/);
    if (match) {
      suffixes.add(match[1] ?? '');
    }
  }

  // also check base keys without suffix
  if (process.env.ADMIN_EMAIL && !suffixes.has('')) {
    suffixes.add('');
  }

  const accounts = [];
  for (const suffix of suffixes) {
    const emailKey = `ADMIN_EMAIL${suffix}`;
    const nameKey = `ADMIN_NAME${suffix}`;
    const passwordKey = `ADMIN_PASSWORD${suffix}`;

    const email = process.env[emailKey];
    const name = process.env[nameKey];
    const password = process.env[passwordKey];

    if (!email || !name || !password) {
      console.warn(`⚠️  Skipping admin entry ${suffix || 'default'} (missing email/name/password env vars).`);
      continue;
    }

    accounts.push({ email, name, password });
  }

  return accounts;
}

const admins = collectAdminEnv();

if (admins.length === 0) {
  console.error('❌ No admin credentials found. Set ADMIN_EMAIL/ADMIN_NAME/ADMIN_PASSWORD (optionally with suffixes like _1).');
  process.exit(1);
}

(async () => {
  try {
    for (const { email, name, password } of admins) {
      const hash = await bcrypt.hash(password, 10);

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          password: hash,
          name,
          isAdmin: true
        },
        create: {
          email,
          name,
          isAdmin: true,
          password: hash,
          league: {
            connectOrCreate: {
              where: { code: ADMIN_LEAGUE_CODE },
              create: {
                code: ADMIN_LEAGUE_CODE,
                name: ADMIN_LEAGUE_NAME
              }
            }
          }
        }
      });

      console.log(`✅ Admin ready at ${user.email}`);
    }
  } catch (error) {
    console.error('❌ Failed to create admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
