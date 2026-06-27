import { serve } from 'inngest/nuxt';
import { inngest } from '~~/server/inngest/client';
import {
  alertHarnessLatency,
  alertAuthFailure,
  archiveCompletedCohortes,
  harnessTriggerFunction,
} from '~~/server/inngest/index';

export default serve({
  client: inngest,
  functions: [alertHarnessLatency, alertAuthFailure, archiveCompletedCohortes, harnessTriggerFunction],
});
