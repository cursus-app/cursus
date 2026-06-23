// Logger Pino structuré + redaction PII.
// Cf. 09-engineering-playbook §5.3-5.4 (pas de console.log, pas de PII).
import { pino } from 'pino';

const isDev = process.env['NODE_ENV'] === 'development';
const isTest = process.env['NODE_ENV'] === 'test';

/**
 * Paths à redacter — toute valeur scannée à ces emplacements est remplacée par [REDACTED].
 * Voir https://github.com/pinojs/pino/blob/main/docs/redaction.md
 *
 * ⚠️ Limite fast-redact : UN SEUL wildcard `*` par path, et il matche EXACTEMENT
 * un niveau. `*.email` ne couvre donc PAS `{ email }` (top-level) ni
 * `{ a: { b: { email } } }` (profondeur 2). On énumère donc explicitement :
 *  - niveau 0 (clé au top-level, ex. `childLogger({ email })`)
 *  - niveau 1 (un wrapper, ex. `{ user: { email } }`)
 *  - emplacements HTTP fréquents (headers/cookies).
 * Règle complémentaire : ne JAMAIS logger d'objet PII brut profondément imbriqué
 * (sélectionner les champs avant de logger).
 *
 * Exporté pour être testable indépendamment (le `logger` est désactivé sous test).
 */
export const REDACT_PATHS = [
  // --- Niveau 0 : clé au top-level ------------------------------------------
  'password',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apiKey',
  'authorization',
  'cookie',
  'secret',
  'signingKey',
  'signing_key',
  'email',
  'phone',
  'ssn',
  // --- Niveau 1 : un objet wrapper ------------------------------------------
  '*.password',
  '*.token',
  '*.access_token',
  '*.refresh_token',
  '*.api_key',
  '*.apiKey',
  '*.authorization',
  '*.secret',
  '*.signingKey',
  '*.signing_key',
  '*.email',
  '*.phone',
  '*.ssn',
  // --- Emplacements HTTP fréquents ------------------------------------------
  'headers.authorization',
  'headers.cookie',
  'req.headers.authorization',
  'req.headers.cookie',
];

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? (isDev ? 'debug' : 'info'),
  enabled: !isTest,
  base: {
    service: 'cursus',
    env: process.env['NODE_ENV'] ?? 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
    remove: false,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  // En dev local : pretty-print via pino-pretty. En prod : JSON pur (Vercel/BetterStack).
  // Spread conditionnel : sous `exactOptionalPropertyTypes`, `transport: undefined`
  // n'est pas assignable — on omet carrément la clé en prod.
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname,service,env',
            singleLine: false,
          },
        },
      }
    : {}),
});

/**
 * Crée un logger enfant avec un contexte stable (requestId, userId, etc.).
 * À utiliser dans les middleware Nitro :
 *
 * ```ts
 * const log = childLogger({ requestId, userId });
 * log.info({ submissionId }, 'submission created');
 * ```
 */
export function childLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
