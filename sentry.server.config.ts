import * as Sentry from '@sentry/nuxt';

const dsn = process.env['NUXT_PUBLIC_SENTRY_DSN'];

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] ?? 'development',

    // Sampling : 20 % en prod, 100 % ailleurs
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.2 : 1.0,

    beforeSend(event) {
      // Ne jamais envoyer de PII utilisateur
      if (event.user) {
        // Supprimer email et IP — garder uniquement l'ID hashé si présent
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}
