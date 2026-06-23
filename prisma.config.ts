// ============================================================================
// Prisma config (Prisma 7+)
// ----------------------------------------------------------------------------
// Depuis Prisma 7, les propriétés `url`, `directUrl`, `shadowDatabaseUrl` ne
// sont plus déclarées dans `prisma/schema.prisma`. Elles sont déplacées ici.
//
// Pour le RUNTIME (PrismaClient), les URLs ne suffisent plus : on doit fournir
// un `driver adapter` au moment de construire le client. Voir
// `server/utils/prisma.ts` qui instancie `PrismaPg({ connectionString }).`
//
// Pour les MIGRATIONS (`prisma migrate dev/deploy/reset`), Prisma utilise les
// URLs déclarées ici. C'est `directUrl` qui sert pour les migrations (port
// 5432 direct), pas le pooler (port 6543).
// ============================================================================
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',

  // Migrations : la directUrl est utilisée car pgBouncer (pooler Supabase)
  // ne supporte pas les commandes DDL nécessaires aux migrations.
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },

  // En Prisma 7, `datasource.url` est utilisée par Migrate / Introspect (DDL),
  // donc on y met la connexion DIRECTE (port 5432) — pgBouncer (pooler) ne
  // supporte pas le DDL. La clé `directUrl` N'EXISTE PLUS dans @prisma/config v7 :
  // au runtime, le pooler est fourni via le driver adapter (cf. server/utils/prisma.ts).
  datasource: {
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'] ?? '',
    // Shadow DB (optionnelle, créée à la demande par `prisma migrate dev`).
    // Spread conditionnel pour respecter `exactOptionalPropertyTypes`.
    ...(process.env['SHADOW_URL'] ? { shadowDatabaseUrl: process.env['SHADOW_URL'] } : {}),
  },
});
