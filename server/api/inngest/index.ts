// Endpoint Inngest serve — point d'entrée unique pour toutes les fonctions Inngest.
// Gère GET (sync Cloud → liste des functions) et POST (invocations).
// Cf. https://www.inngest.com/docs/sdk/serve
import { serve } from 'inngest/nitro';
import { inngest } from '~~/server/utils/inngest';
import {
  alertAuthFailure,
  alertHarnessLatency,
  archiveCompletedCohortes,
  checkBrokenLinksFunction,
  cleanupStaleRuns,
  detectProgressionAlerts,
  gdprDeleteFunction,
  gdprExportFunction,
  harnessTriggerFunction,
  triggerGithubHarness,
} from '~~/server/inngest/index';

export default serve({
  client: inngest,
  functions: [
    alertAuthFailure,
    alertHarnessLatency,
    archiveCompletedCohortes,
    checkBrokenLinksFunction,
    cleanupStaleRuns,
    detectProgressionAlerts,
    gdprDeleteFunction,
    gdprExportFunction,
    harnessTriggerFunction,
    triggerGithubHarness,
  ],
});
