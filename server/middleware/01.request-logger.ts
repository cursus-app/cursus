// Middleware Nitro — log structuré de chaque requête HTTP.
// Injecte un traceId (depuis x-request-id ou UUID v4 généré) dans :
//  - event.context.traceId  → réutilisable dans les handlers
//  - event.context.logger   → logger enfant avec traceId bindé
//  - header x-request-id    → corrélation côté client / Sentry
//
// Logs émis :
//  - "req" à l'entrée  : method + url
//  - "res" à la sortie : method + url + status + durationMs
//
// Cf. ST-16.1 / TT-16.1.2
import { randomUUID } from 'node:crypto';
import { childLogger } from '~~/server/utils/logger';

export default defineEventHandler((event) => {
  // Réutilise l'en-tête x-request-id si présent (propagation depuis le client/CDN),
  // sinon génère un UUID v4. On tronque à 36 chars pour les UUIDs déjà en forme canonique.
  const traceId = (getHeader(event, 'x-request-id') ?? randomUUID()).slice(0, 36);

  const req = childLogger({ traceId });

  // Propagation côté client pour corrélation Sentry ↔ logs serveur
  setHeader(event, 'x-request-id', traceId);

  const start = performance.now();
  const method = event.method;
  const url = getRequestURL(event).pathname;

  req.info({ method, url }, 'req');

  // Injecte dans le contexte H3 pour les handlers downstream
  event.context['logger'] = req;
  event.context['traceId'] = traceId;

  // Logue la réponse une fois que Node a terminé de l'envoyer.
  // `finish` est émis après que tous les chunks sont écrits + socket flushé.
  event.node.res.once('finish', () => {
    const durationMs = Math.round(performance.now() - start);
    const status = event.node.res.statusCode;
    req.info({ method, url, status, durationMs }, 'res');
  });
});
