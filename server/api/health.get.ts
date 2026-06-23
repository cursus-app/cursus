// GET /api/health — endpoint santé.
// Ping DB + retourne version, uptime, environnement.
// Utilisé par :
//   - sondes Vercel / load balancers
//   - dashboard ops
//   - page d'accueil (indicateur visible)
//
// Volontairement public et sans rate-limit (sondes externes).
import { pingDatabase } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import type { HealthResponse } from '~~/shared/types/health';

const SERVICE_VERSION = process.env['npm_package_version'] ?? '0.1.0';
const startedAt = Date.now();

export default defineEventHandler(async (event): Promise<HealthResponse> => {
  const dbLatency = await pingDatabase();
  const dbOk = dbLatency !== null;

  const response: HealthResponse = {
    ok: dbOk,
    service: 'cursus',
    version: SERVICE_VERSION,
    environment: process.env['NUXT_PUBLIC_ENVIRONMENT'] ?? 'development',
    uptime: Math.round((Date.now() - startedAt) / 1000),
    database: {
      ok: dbOk,
      latencyMs: dbLatency,
    },
    timestamp: new Date().toISOString(),
  };

  if (!dbOk) {
    setResponseStatus(event, 503);
    logger.warn({ response }, 'health check: database unreachable');
  }

  return response;
});
