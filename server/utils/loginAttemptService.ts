// Service de verrouillage de compte par tentatives échouées — ST-15.4 TT-15.4.5.
//
// Architecture :
//  - RedisLoginAttemptService  : implémentation production (Upstash Redis)
//  - NoopLoginAttemptService   : mode dev/test sans Redis configuré (fail-open)
//  - getLoginAttemptService()  : singleton — choisit l'impl selon les env vars
//
// Sécurité :
//  - Les emails sont hashés en SHA-256 (16 chars) dans les clés Redis → pas de PII
//  - Les compteurs utilisent des fenêtres glissantes (expiry TTL par clé)
//  - Les opérations Redis sont pipelines pour minimiser la latence
//
// Seuils (cf. ST-15.4) :
//  - 5 tentatives en 15 min → lockout 15 min
//  - 10 tentatives en 1h   → lockout 1h
//  - 20 tentatives en 24h  → lockout 24h

import { createHash } from 'node:crypto'
import { logger } from '~~/server/utils/logger'

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

export interface LoginCheckResult {
  /** L'accès est-il autorisé ? */
  allowed: boolean
  /** Date jusqu'à laquelle le compte est verrouillé (si !allowed). */
  lockedUntil?: Date
  /** Tentatives restantes avant lockout (si allowed et proche du seuil). */
  remainingAttempts?: number
}

export interface LoginAttemptService {
  /**
   * Vérifie si le compte est verrouillé sans enregistrer de tentative.
   * À appeler AVANT d'interroger Supabase pour éviter les tentatives inutiles.
   */
  isLocked(email: string): Promise<{ locked: boolean; lockedUntil?: Date }>

  /**
   * Enregistre une tentative et vérifie si un lockout doit être appliqué.
   * @param email   Email de l'utilisateur (hashé avant stockage Redis)
   * @param ip      IP source (pour logs — non stockée dans Redis)
   * @param success true si le login a réussi (reset des compteurs)
   */
  checkAndRecord(email: string, ip: string, success: boolean): Promise<LoginCheckResult>

  /**
   * Lève manuellement le verrouillage (ex. : après reset par magic-link).
   */
  clearLockout(email: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Interface minimale du client Redis (duck typing pour testabilité)
// ---------------------------------------------------------------------------

interface RedisClient {
  get<T>(key: string): Promise<T | null>
  set(key: string, value: string, options?: { ex: number }): Promise<unknown>
  pipeline(): {
    del(...keys: string[]): unknown
    incr(key: string): unknown
    expire(key: string, seconds: number): unknown
    exec(): Promise<Array<number | null>>
  }
}

// ---------------------------------------------------------------------------
// Utilitaire interne : hash email pour les clés Redis
// ---------------------------------------------------------------------------

function hashEmailForRedis(email: string): string {
  return createHash('sha256')
    .update(email.toLowerCase().trim())
    .digest('hex')
    .slice(0, 16)
}

// ---------------------------------------------------------------------------
// Implémentation Redis (production)
// ---------------------------------------------------------------------------

/**
 * Implémentation production — utilise Upstash Redis via injection de dépendance.
 * Exportée pour être testable directement avec un mock Redis.
 */
export class RedisLoginAttemptService implements LoginAttemptService {
  private redis: RedisClient

  constructor(redis: RedisClient) {
    this.redis = redis
  }

  async isLocked(email: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
    const emailHash = hashEmailForRedis(email)
    const lockKey = `auth:lock:${emailHash}`

    const lockedUntil = await this.redis.get<string>(lockKey)
    if (lockedUntil) {
      return { locked: true, lockedUntil: new Date(lockedUntil) }
    }
    return { locked: false }
  }

  async checkAndRecord(email: string, ip: string, success: boolean): Promise<LoginCheckResult> {
    const emailHash = hashEmailForRedis(email)
    const lockKey = `auth:lock:${emailHash}`
    const key15m = `auth:attempts:${emailHash}:15m`
    const key1h = `auth:attempts:${emailHash}:1h`
    const key24h = `auth:attempts:${emailHash}:24h`

    // Vérifier si déjà verrouillé
    const existingLock = await this.redis.get<string>(lockKey)
    if (existingLock) {
      const lockedUntil = new Date(existingLock)
      logger.warn(
        { emailHash, event: 'auth.login.blocked_locked', ip_hash: hashEmailForRedis(ip) },
        'auth.account.already_locked',
      )
      return { allowed: false, lockedUntil }
    }

    if (success) {
      // Succès → reset toutes les clés de compteur
      const pipe = this.redis.pipeline()
      pipe.del(key15m, key1h, key24h)
      await pipe.exec()
      return { allowed: true }
    }

    // Échec → incrémenter les compteurs (fenêtres glissantes via TTL)
    const pipe = this.redis.pipeline()
    pipe.incr(key15m)
    pipe.expire(key15m, 15 * 60)
    pipe.incr(key1h)
    pipe.expire(key1h, 60 * 60)
    pipe.incr(key24h)
    pipe.expire(key24h, 24 * 60 * 60)
    const results = await pipe.exec()

    // pipeline exec() retourne les résultats dans l'ordre des commandes
    // indices : 0=incr15m, 1=expire, 2=incr1h, 3=expire, 4=incr24h, 5=expire
    const count15m = results[0] ?? 0
    const count1h = results[2] ?? 0
    const count24h = results[4] ?? 0

    // Appliquer le seuil de lockout le plus sévère applicable
    let lockoutSeconds = 0
    if (count24h >= 20) {
      lockoutSeconds = 24 * 60 * 60
    } else if (count1h >= 10) {
      lockoutSeconds = 60 * 60
    } else if (count15m >= 5) {
      lockoutSeconds = 15 * 60
    }

    if (lockoutSeconds > 0) {
      const until = new Date(Date.now() + lockoutSeconds * 1000)
      await this.redis.set(lockKey, until.toISOString(), { ex: lockoutSeconds })
      logger.warn(
        {
          emailHash,
          event: 'auth.account.locked',
          lockoutSeconds,
          lockedUntil: until.toISOString(),
        },
        'auth.account.locked',
      )
      return { allowed: false, lockedUntil: until }
    }

    // Pas encore verrouillé — indiquer les tentatives restantes (basé sur fenêtre 15min)
    const remainingAttempts = Math.max(0, 5 - count15m)
    return { allowed: true, remainingAttempts }
  }

  async clearLockout(email: string): Promise<void> {
    const emailHash = hashEmailForRedis(email)
    const lockKey = `auth:lock:${emailHash}`
    const key15m = `auth:attempts:${emailHash}:15m`
    const key1h = `auth:attempts:${emailHash}:1h`
    const key24h = `auth:attempts:${emailHash}:24h`

    const pipe = this.redis.pipeline()
    pipe.del(lockKey, key15m, key1h, key24h)
    await pipe.exec()
    logger.info({ emailHash, event: 'auth.lockout.cleared' }, 'auth.lockout.cleared')
  }
}

// ---------------------------------------------------------------------------
// Implémentation No-op (dev / test sans Redis)
// ---------------------------------------------------------------------------

/**
 * Implémentation de remplacement quand Upstash n'est pas configuré.
 * Fail-open : toutes les tentatives sont autorisées.
 * Exportée pour les tests unitaires.
 */
export class NoopLoginAttemptService implements LoginAttemptService {
  async isLocked(_email: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
    return { locked: false }
  }

  async checkAndRecord(
    _email: string,
    _ip: string,
    _success: boolean,
  ): Promise<LoginCheckResult> {
    return { allowed: true }
  }

  async clearLockout(_email: string): Promise<void> {
    // No-op
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _service: LoginAttemptService | null = null

/**
 * Retourne le service de lockout approprié selon la configuration.
 * Singleton : instancié une seule fois par processus.
 *
 * Si UPSTASH_REDIS_REST_URL / _TOKEN ne sont pas définis → NoopLoginAttemptService
 * (ne bloque pas le développement local).
 */
export async function getLoginAttemptService(): Promise<LoginAttemptService> {
  if (_service) { return _service }

  const url = process.env['UPSTASH_REDIS_REST_URL']
  const token = process.env['UPSTASH_REDIS_REST_TOKEN']

  if (!url || !token) {
    logger.warn(
      { event: 'auth.lockout.noop' },
      'Upstash Redis non configuré — lockout désactivé (NoopLoginAttemptService)',
    )
    _service = new NoopLoginAttemptService()
    return _service
  }

  // Import dynamique pour éviter l'évaluation du module sans Redis configuré
  const { Redis } = await import('@upstash/redis')
  const redis = new Redis({ url, token })
  _service = new RedisLoginAttemptService(redis)
  return _service
}

/**
 * Réinitialise le singleton — UNIQUEMENT pour les tests.
 * @internal
 */
export function _resetLoginAttemptServiceForTests(): void {
  _service = null
}
