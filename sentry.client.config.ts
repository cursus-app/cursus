import * as Sentry from '@sentry/nuxt';

const dsn = process.env['NUXT_PUBLIC_SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] ?? 'development',

    // Sampling : 20 % en prod (suffisant pour les traces de perf), 100 % ailleurs
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.2 : 1.0,

    // Replay : 10 % sessions normales, 100 % si erreur
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        // PII masqué par défaut
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    beforeSend(event) {
      // Filtrer les erreurs non-actionnables (bruit connu)
      const msg = event.exception?.values?.[0]?.value ?? '';
      const ignoredPatterns = [
        /ResizeObserver loop/i,
        /Network request failed/i,
        /Load failed/i,
        /Failed to fetch/i,
        /ChunkLoadError/i,
      ];
      if (ignoredPatterns.some((p) => p.test(msg))) {
        return null;
      }

      // Scrub PII potentiel dans les URLs (ex : /users/uuid → /users/[id])
      if (event.request?.url) {
        event.request.url = event.request.url.replace(/\/users\/[^/]+/g, '/users/[id]');
      }

      return event;
    },
  });
}
