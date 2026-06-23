// Singleton Prisma Client — anti-leak en dev hot-reload.
// Cf. 09-engineering-playbook §13.3 — règle absolue : ne JAMAIS instancier
// `new PrismaClient()` ailleurs que dans ce fichier.
//
// Depuis Prisma 7, l'URL de la DB n'est plus dans `schema.prisma`. Il faut
// passer un `driver adapter` au constructeur. Pour PostgreSQL/Supabase,
// on utilise `@prisma/adapter-pg`. Les URLs sont lues depuis `prisma.config.ts`
// par les commandes Migrate, et depuis l'env au runtime ci-dessous.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeAdapter() {
  const connectionString = process.env['DATABASE_URL'] ?? process.env['DIRECT_URL'] ?? '';
  if (!connectionString) {
    throw new Error('[prisma] DATABASE_URL ou DIRECT_URL manquant — vérifie ton .env');
  }
  return new PrismaPg({ connectionString });
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    adapter: makeAdapter(),
    // Tous les niveaux sont émis en `event` puis routés vers Pino. Sans handler
    // `$on`, un `emit: 'event'` perd silencieusement les logs (notamment les
    // erreurs/warns DB en prod). La verbosité est pilotée par le niveau Pino :
    // query/info partent en `debug` (filtré en prod où LOG_LEVEL=info).
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
    errorFormat: process.env['NODE_ENV'] === 'production' ? 'minimal' : 'pretty',
  });

  // NB : on ne logge PAS `e.params` (peut contenir de la PII) — seulement la
  // requête paramétrée et la durée.
  client.$on('query', (e) =>
    logger.debug({ query: e.query, durationMs: e.duration }, 'prisma:query'),
  );
  client.$on('info', (e) => logger.debug({ message: e.message }, 'prisma:info'));
  client.$on('warn', (e) => logger.warn({ message: e.message }, 'prisma:warn'));
  client.$on('error', (e) => logger.error({ message: e.message }, 'prisma:error'));

  return client;
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Ping rapide : `SELECT 1`. Renvoie la latence en ms ou `null` si l'appel échoue.
 * Utilisé par `/api/health`.
 */
export async function pingDatabase(): Promise<number | null> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Math.round(performance.now() - start);
  } catch {
    return null;
  }
}
