// Singleton Inngest client — à importer depuis ce fichier uniquement.
// Cf. 09-engineering-playbook §13 (pattern singleton, analogie Prisma).
import { Inngest } from 'inngest';
import { logger } from './logger';

const inngestLogger = {
  debug: (...args: unknown[]) => logger.debug({ args }, 'inngest:debug'),
  info: (...args: unknown[]) => logger.info({ args }, 'inngest:info'),
  warn: (...args: unknown[]) => logger.warn({ args }, 'inngest:warn'),
  error: (...args: unknown[]) => logger.error({ args }, 'inngest:error'),
};

// `exactOptionalPropertyTypes` exige qu'on n'inclue pas une clé dont la valeur
// est `undefined`. On passe donc `eventKey` uniquement si la variable d'env est définie.
const eventKey = process.env['INNGEST_EVENT_KEY'];
export const inngest = new Inngest({
  id: 'cursus',
  ...(eventKey !== undefined ? { eventKey } : {}),
  logger: inngestLogger,
});
