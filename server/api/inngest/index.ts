// Endpoint Inngest serve — requis pour que le cloud Inngest puisse invoquer les fonctions.
// Cf. https://www.inngest.com/docs/sdk/serve
import { serve } from 'inngest/nitro';
import { inngest } from '~~/server/utils/inngest';
import { gdprExportFunction } from '~~/server/inngest/gdpr-export';
import { gdprDeleteFunction } from '~~/server/inngest/gdpr-delete';

export default serve({
  client: inngest,
  functions: [gdprExportFunction, gdprDeleteFunction],
});
