/**
 * Rate limiter en mémoire simple (par process).
 * En production avec plusieurs instances, migrer vers Upstash Redis.
 * Cf. CLAUDE.md §Sécurité — rate limiting sur endpoints sensibles.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Vérifie et incrémente le compteur de rate limit pour une clé.
 * Lance une erreur 429 si la limite est dépassée.
 *
 * @param key     - Clé unique (ex. `cursus:create:${userId}`)
 * @param max     - Nombre maximal de requêtes dans la fenêtre
 * @param windowMs - Durée de la fenêtre en millisecondes
 */
export function checkRateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= max) {
    const remainingSec = Math.ceil((entry.resetAt - now) / 1_000);
    throw createError({
      statusCode: 429,
      message: `Trop de requêtes. Réessayez dans ${remainingSec}s.`,
    });
  }

  entry.count += 1;
}
