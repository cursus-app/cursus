// Re-export du client canonical (avec logger Pino) pour rétrocompatibilité.
// Tous les imports de ~~/server/inngest/client et ~~/server/utils/inngest
// obtiennent ainsi la même instance via le module system de Node.
export { inngest } from '~~/server/utils/inngest';
