// Augmentation du type H3EventContext pour exposer les propriétés injectées
// par les middlewares Nitro.
//
// Consommation dans les handlers :
//
//   const log = event.context.logger ?? logger;
//   const traceId = event.context.traceId;
//   const locale = event.context.locale ?? 'fr';
//
// Cf. ST-16.1 / TT-16.1.2, ST-19.4 / TT-19.4.5
import type { Logger } from 'pino';
import type { SupportedLocale } from '~~/shared/types/locale';

declare module 'h3' {
  interface H3EventContext {
    logger?: Logger;
    traceId?: string;
    /** Locale résolue par 02.resolve-locale.ts — utilisée par tServer() et respondError() */
    locale?: SupportedLocale;
  }
}
