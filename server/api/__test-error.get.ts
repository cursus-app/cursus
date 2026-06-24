// GET /__test-error — route de test Sentry + Pino.
// Provoque une erreur intentionnelle pour vérifier que Sentry la capture et
// que Pino logue correctement le contexte (requestId, status, duration_ms).
//
// SÉCURITÉ : bloquée en production sauf si ENABLE_TEST_ERROR_ROUTE=true est
// explicitement positionné (ne doit jamais être activé en prod réelle).
//
// Usage :
//   GET /__test-error?mode=unhandled   → erreur non catchée (500 → Sentry auto)
//   GET /__test-error?mode=manual      → capture manuelle via Sentry.captureException
//   GET /__test-error?mode=warn        → 400 loguée en warn (pas en error)
//   GET /__test-error                  → alias de mode=manual
//
// TT-01.7.5
import * as Sentry from '@sentry/nuxt';
import { logger } from '~~/server/utils/logger';

export default defineEventHandler((event) => {
  // Bloquer en production si la variable de déverrouillage est absente
  if (
    process.env['NODE_ENV'] === 'production' &&
    !process.env['ENABLE_TEST_ERROR_ROUTE']
  ) {
    throw createError({ statusCode: 404 });
  }

  const mode = String(getQuery(event)['mode'] ?? 'manual');

  if (mode === 'unhandled') {
    // L'erreur non catchée remonte via le gestionnaire global Nitro → Sentry
    throw new Error('[test] Erreur intentionnelle non catchée — Sentry devrait capturer');
  }

  if (mode === 'warn') {
    // Erreur 400 : loguée en warn par le middleware request-logger, pas envoyée
    // dans Sentry (4xx ne génèrent pas d'alerte bruit).
    throw createError({
      statusCode: 400,
      message: '[test] Erreur de validation intentionnelle (mode=warn)',
    });
  }

  // mode === 'manual' (défaut) : on capture l'erreur explicitement via le SDK Sentry
  try {
    throw new Error('[test] Erreur intentionnelle capturée manuellement via Sentry');
  } catch (err) {
    Sentry.captureException(err, {
      tags: {
        route: '/__test-error',
        mode: 'manual',
      },
    });
    logger.warn({ mode }, '[test-error] erreur de test capturée manuellement');
  }

  return {
    ok: true,
    message: 'Erreur de test capturée. Vérifier le dashboard Sentry.',
    timestamp: new Date().toISOString(),
    env: process.env['NODE_ENV'] ?? 'development',
    mode,
  };
});
