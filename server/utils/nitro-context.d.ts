// Augmentation du type H3EventContext pour exposer les propriétés injectées
// par le middleware 01.request-logger.ts.
// Consommation dans les handlers :
//
//   const log = event.context.logger ?? logger;
//   const traceId = event.context.traceId;
//
// Cf. ST-16.1 / TT-16.1.2
import type { Logger } from 'pino';

declare module 'h3' {
  interface H3EventContext {
    logger?: Logger;
    traceId?: string;
  }
}
