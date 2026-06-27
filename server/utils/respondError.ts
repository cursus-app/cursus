/**
 * respondError — Helper pour retourner des erreurs API localisées.
 *
 * Produit une réponse H3Error structurée avec message localisé selon
 * la locale de la requête (event.context.locale posée par 02.resolve-locale.ts).
 *
 * Usage dans un handler Nitro :
 *   throw respondError(event, 'auth.errors.invalidCredentials');
 *   throw respondError(event, 'cursus.errors.notFound', undefined, { statusCode: 404 });
 *   throw respondError(event, 'cursus.modules.count', { n: 3 }, { statusCode: 422 });
 *
 * Cf. ST-19.4 / TT-19.4.4
 */
import type { H3Event } from 'h3';
import { tServer } from '~~/server/utils/i18n';

interface RespondErrorOptions {
  /** Code HTTP de la réponse (défaut : 400) */
  statusCode?: number;
  /** Données additionnelles dans le payload d'erreur (ex : lockedUntil) */
  data?: Record<string, unknown>;
}

/**
 * Crée et retourne une erreur H3 avec un message localisé selon la locale du request.
 *
 * @param event      - L'événement H3 (pour lire event.context.locale)
 * @param errorKey   - Clé dot-notation dans locales/*.json
 * @param params     - Paramètres d'interpolation optionnels (ex : { count: 5 })
 * @param options    - Options supplémentaires (statusCode, data)
 * @returns Une erreur H3 prête à être thrown depuis un handler
 */
export function respondError(
  event: H3Event,
  errorKey: string,
  params?: Record<string, string | number>,
  options: RespondErrorOptions = {},
): ReturnType<typeof createError> {
  const locale = event.context.locale ?? 'fr';
  const { statusCode = 400, data } = options;

  const message = tServer(locale, errorKey, params);

  return createError({
    statusCode,
    message,
    data: {
      code: errorKey,
      ...data,
    },
  });
}
