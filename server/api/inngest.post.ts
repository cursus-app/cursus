import { serve } from 'inngest/nuxt';
import { inngest } from '~~/server/inngest/client';
import { alertHarnessLatency, alertAuthFailure } from '~~/server/inngest/index';

export default serve({
  client: inngest,
  functions: [alertHarnessLatency, alertAuthFailure],
});
