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

/**
 * Vérifie et incrémente atomiquement le compteur de rate limit par un nombre
 * arbitraire de slots (utile pour les batchs d'emails).
 * Lance une erreur 429 si l'ajout de `count` dépasserait la limite.
 *
 * @param key      - Clé unique (ex. `invitations:batch:${userId}`)
 * @param count    - Nombre de slots à consommer
 * @param max      - Quota maximal dans la fenêtre
 * @param windowMs - Durée de la fenêtre en millisecondes
 */
export function checkRateLimitBulk(
  key: string,
  count: number,
  max: number,
  windowMs: number,
): void {
  const now = Date.now();
  const entry = store.get(key);

  const current = !entry || now >= entry.resetAt ? 0 : entry.count;
  const resetAt = !entry || now >= entry.resetAt ? now + windowMs : entry.resetAt;

  if (current + count > max) {
    const remaining = Math.max(0, max - current);
    const remainingSec = Math.ceil((resetAt - now) / 1_000);
    throw createError({
      statusCode: 429,
      message: `Quota d'invitations dépassé (${remaining} restante(s) sur ${max}/h). Réessayez dans ${remainingSec}s.`,
    });
  }

  store.set(key, { count: current + count, resetAt });
}
