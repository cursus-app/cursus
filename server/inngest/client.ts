import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'cursus',
  // INNGEST_EVENT_KEY est lu automatiquement depuis process.env par le SDK.
  // INNGEST_SIGNING_KEY idem pour la vérification des requêtes.
});
