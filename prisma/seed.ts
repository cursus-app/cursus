// Prisma seed dev local — peuple la DB avec des données minimales pour développer.
// Lancement : `pnpm prisma db seed`
//
// IMPORTANT : ce seed est destiné UNIQUEMENT au dev. Ne PAS le lancer en prod
// (les UUIDs sont régénérés à chaque run, idempotence via upsert).
//
// Depuis Prisma 7, l'URL de la DB n'est plus dans `schema.prisma` et un driver
// adapter est OBLIGATOIRE au constructeur (un `new PrismaClient()` nu throw).
// Ce script standalone (tsx) ne peut pas importer le singleton Nitro (~~), donc
// on construit l'adapter localement — on utilise DIRECT_URL (connexion directe,
// pas le pooler) car c'est un script ponctuel.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'] ?? '';
if (!connectionString) {
  throw new Error('[seed] DIRECT_URL ou DATABASE_URL manquant — vérifie ton .env');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[seed] Starting…');

  // 1 admin (Mohamed) ----------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'mohamed@cursus.app' },
    update: {},
    create: {
      email: 'mohamed@cursus.app',
      fullName: 'Mohamed',
      globalRole: 'ADMIN',
      locale: 'fr',
      timezone: 'Europe/Paris',
    },
  });

  // 1 cursus de démo ----------------------------------------------------------
  const cursus = await prisma.cursus.upsert({
    where: { slug: 'fullstack-foundation' },
    update: {},
    create: {
      title: 'Fullstack Foundation',
      slug: 'fullstack-foundation',
      domain: 'fullstack',
      level: 'BEGINNER',
      durationWeeks: 12,
      description: 'Parcours de découverte fullstack — Git, JS, React, Node, DB.',
      status: 'DRAFT',
      ownerId: admin.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log('[seed] Done.', { adminId: admin.id, cursusId: cursus.id });
}

main()
  .catch((err) => {
    console.error('[seed] FAILED', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
