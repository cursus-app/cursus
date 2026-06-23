// Plugin Nitro — validation Zod des variables d'environnement au démarrage.
// Le préfixe `00.` garantit l'exécution AVANT les autres plugins server.
//
// Sans ce plugin, `getEnv()` (server/utils/env.ts) n'est appelé que paresseusement
// via le Proxy `env`, donc une config invalide passait inaperçue au boot. Ici on
// force l'évaluation : si une variable critique manque, on throw immédiatement
// (fail-fast) plutôt que de planter au premier accès en pleine requête.
import { getEnv } from '~~/server/utils/env';
import { logger } from '~~/server/utils/logger';

export default defineNitroPlugin(() => {
  getEnv();
  logger.info('env: variables d’environnement validées au boot');
});
