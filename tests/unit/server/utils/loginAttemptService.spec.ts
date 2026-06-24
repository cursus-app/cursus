// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  NoopLoginAttemptService,
  RedisLoginAttemptService,
  getLoginAttemptService,
  _resetLoginAttemptServiceForTests,
} from '~~/server/utils/loginAttemptService'

// Logger mocké pour éviter le bruit et vérifier les appels
vi.mock('~~/server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Factory : mock Redis pipeline configurable
// ---------------------------------------------------------------------------

/**
 * Crée un faux client Redis avec get/set/pipeline mockés.
 * L'injection directe évite tout problème de mocking des imports dynamiques.
 */
function buildFakeRedis({
  lockValue = null as string | null,
  pipelineResults = [1, 1, 1, 1, 1, 1] as Array<number | null>,
} = {}) {
  const pipelineMock = {
    del: vi.fn().mockReturnThis(),
    incr: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(pipelineResults),
  }

  const redisMock = {
    get: vi.fn().mockResolvedValue(lockValue),
    set: vi.fn().mockResolvedValue('OK'),
    pipeline: vi.fn().mockReturnValue(pipelineMock),
  }

  return { redisMock, pipelineMock }
}

// ---------------------------------------------------------------------------
// NoopLoginAttemptService
// ---------------------------------------------------------------------------

describe('NoopLoginAttemptService', () => {
  const service = new NoopLoginAttemptService()

  describe('isLocked()', () => {
    it('retourne toujours { locked: false }', async () => {
      const result = await service.isLocked('anyone@example.com')
      expect(result.locked).toBe(false)
      expect(result.lockedUntil).toBeUndefined()
    })
  })

  describe('checkAndRecord()', () => {
    it('retourne { allowed: true } peu importe le nombre de tentatives', async () => {
      for (let i = 0; i < 10; i++) {
        const r = await service.checkAndRecord('test@example.com', '127.0.0.1', false)
        expect(r.allowed).toBe(true)
        expect(r.lockedUntil).toBeUndefined()
      }
    })

    it('retourne { allowed: true } en cas de succès', async () => {
      const r = await service.checkAndRecord('test@example.com', '127.0.0.1', true)
      expect(r.allowed).toBe(true)
    })
  })

  describe('clearLockout()', () => {
    it("ne lève pas d'erreur", async () => {
      await expect(service.clearLockout('test@example.com')).resolves.toBeUndefined()
    })
  })
})

// ---------------------------------------------------------------------------
// RedisLoginAttemptService — injection directe du client Redis
// ---------------------------------------------------------------------------

describe('RedisLoginAttemptService', () => {
  describe('isLocked()', () => {
    it('retourne { locked: false } si aucune clé lock en Redis', async () => {
      const { redisMock } = buildFakeRedis({ lockValue: null })
      // @ts-expect-error — redisMock satisfait l'interface RedisClient minimale
      const service = new RedisLoginAttemptService(redisMock)

      const result = await service.isLocked('user@example.com')
      expect(result.locked).toBe(false)
      expect(result.lockedUntil).toBeUndefined()
    })

    it('retourne { locked: true, lockedUntil } si clé lock présente en Redis', async () => {
      const futureDate = new Date(Date.now() + 15 * 60 * 1000)
      const { redisMock } = buildFakeRedis({ lockValue: futureDate.toISOString() })
      // @ts-expect-error — redisMock satisfait l'interface RedisClient minimale
      const service = new RedisLoginAttemptService(redisMock)

      const result = await service.isLocked('user@example.com')
      expect(result.locked).toBe(true)
      expect(result.lockedUntil).toBeInstanceOf(Date)
      expect(result.lockedUntil?.toISOString()).toBe(futureDate.toISOString())
    })
  })

  describe('checkAndRecord()', () => {
    it('retourne { allowed: false } si le compte est déjà verrouillé (clé lock présente)', async () => {
      const futureDate = new Date(Date.now() + 15 * 60 * 1000)
      const { redisMock } = buildFakeRedis({ lockValue: futureDate.toISOString() })
      // @ts-expect-error — redisMock satisfait l'interface RedisClient minimale
      const service = new RedisLoginAttemptService(redisMock)

      const result = await service.checkAndRecord('user@example.com', '10.0.0.1', false)
      expect(result.allowed).toBe(false)
      expect(result.lockedUntil).toBeInstanceOf(Date)
    })

    it('reset les compteurs via pipeline et retourne allowed:true en cas de succès', async () => {
      const { redisMock, pipelineMock } = buildFakeRedis({ lockValue: null })
      // @ts-expect-error — redisMock satisfait l'interface RedisClient minimale
      const service = new RedisLoginAttemptService(redisMock)

      const result = await service.checkAndRecord('user@example.com', '10.0.0.1', true)
      expect(result.allowed).toBe(true)
      // Le pipeline doit avoir supprimé les 3 clés de compteur
      expect(pipelineMock.del).toHaveBeenCalledTimes(1)
      expect(pipelineMock.exec).toHaveBeenCalled()
    })

    it('incrémente les compteurs sur un échec et retourne remainingAttempts si pas de lockout', async () => {
      // count15m=3, count1h=3, count24h=3 → pas de lockout, 2 tentatives restantes
      const { redisMock, pipelineMock } = buildFakeRedis({
        lockValue: null,
        pipelineResults: [3, 1, 3, 1, 3, 1],
      })
      // @ts-expect-error — redisMock satisfait l'interface RedisClient minimale
      const service = new RedisLoginAttemptService(redisMock)

      const result = await service.checkAndRecord('user@example.com', '10.0.0.1', false)
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(2) // 5 - 3
      // 3 incr (15m, 1h, 24h) + 3 expire = 6 appels pipeline
      expect(pipelineMock.incr).toHaveBeenCalledTimes(3)
      expect(pipelineMock.expire).toHaveBeenCalledTimes(3)
    })

    it('applique le lockout 15min quand count15m atteint 5 (seuil le plus bas)', async () => {
      // count15m=5 → seuil 15min
      const { redisMock } = buildFakeRedis({
        lockValue: null,
        pipelineResults: [5, 1, 5, 1, 5, 1],
      })
      // @ts-expect-error — redisMock satisfait l'interface RedisClient minimale
      const service = new RedisLoginAttemptService(redisMock)

      const result = await service.checkAndRecord('user@example.com', '10.0.0.1', false)
      expect(result.allowed).toBe(false)
      expect(result.lockedUntil).toBeInstanceOf(Date)
      // Durée attendue : ~15 min
      const lockedUntil15m = result.lockedUntil as Date
      const diffMs = lockedUntil15m.getTime() - Date.now()
      expect(diffMs).toBeGreaterThan(14 * 60 * 1000)
      expect(diffMs).toBeLessThan(16 * 60 * 1000)
      // set() doit être appelé avec les bons paramètres
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:lock:'),
        expect.any(String),
        { ex: 15 * 60 },
      )
    })

    it('applique le lockout 1h quand count1h atteint 10 (count15m < 5)', async () => {
      // count15m=4 (pas encore seuil), count1h=10, count24h=10 → lockout 1h
      const { redisMock } = buildFakeRedis({
        lockValue: null,
        pipelineResults: [4, 1, 10, 1, 10, 1],
      })
      // @ts-expect-error — redisMock satisfait l'interface RedisClient minimale
      const service = new RedisLoginAttemptService(redisMock)

      const result = await service.checkAndRecord('user@example.com', '10.0.0.1', false)
      expect(result.allowed).toBe(false)
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:lock:'),
        expect.any(String),
        { ex: 60 * 60 },
      )
      const lockedUntil1h = result.lockedUntil as Date
      const diffMs = lockedUntil1h.getTime() - Date.now()
      expect(diffMs).toBeGreaterThan(59 * 60 * 1000)
      expect(diffMs).toBeLessThan(61 * 60 * 1000)
    })

    it('applique le lockout 24h quand count24h atteint 20 (seuil le plus sévère)', async () => {
      // count15m=4, count1h=9, count24h=20 → lockout 24h
      const { redisMock } = buildFakeRedis({
        lockValue: null,
        pipelineResults: [4, 1, 9, 1, 20, 1],
      })
      // @ts-expect-error — redisMock satisfait l'interface RedisClient minimale
      const service = new RedisLoginAttemptService(redisMock)

      const result = await service.checkAndRecord('user@example.com', '10.0.0.1', false)
      expect(result.allowed).toBe(false)
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:lock:'),
        expect.any(String),
        { ex: 24 * 60 * 60 },
      )
      const lockedUntil24h = result.lockedUntil as Date
      const diffMs = lockedUntil24h.getTime() - Date.now()
      expect(diffMs).toBeGreaterThan(23 * 60 * 60 * 1000)
      expect(diffMs).toBeLessThan(25 * 60 * 60 * 1000)
    })
  })

  describe('clearLockout()', () => {
    it('supprime toutes les clés Redis (lock + 3 compteurs) via pipeline', async () => {
      const { redisMock, pipelineMock } = buildFakeRedis()
      // @ts-expect-error — redisMock satisfait l'interface RedisClient minimale
      const service = new RedisLoginAttemptService(redisMock)

      await service.clearLockout('user@example.com')
      // del appelé une fois avec les 4 clés
      expect(pipelineMock.del).toHaveBeenCalledTimes(1)
      expect(pipelineMock.exec).toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// getLoginAttemptService() — sélection singleton selon env vars
// ---------------------------------------------------------------------------

describe('getLoginAttemptService()', () => {
  beforeEach(() => {
    _resetLoginAttemptServiceForTests()
    delete process.env['UPSTASH_REDIS_REST_URL']
    delete process.env['UPSTASH_REDIS_REST_TOKEN']
  })

  afterEach(() => {
    _resetLoginAttemptServiceForTests()
    delete process.env['UPSTASH_REDIS_REST_URL']
    delete process.env['UPSTASH_REDIS_REST_TOKEN']
  })

  it('retourne NoopLoginAttemptService quand les vars Upstash sont absentes', async () => {
    const svc = await getLoginAttemptService()
    expect(svc).toBeInstanceOf(NoopLoginAttemptService)
  })

  it('retourne le même singleton sur deux appels successifs (sans Redis)', async () => {
    const s1 = await getLoginAttemptService()
    const s2 = await getLoginAttemptService()
    expect(s1).toBe(s2)
  })

  it('retourne une instance différente de NoopLoginAttemptService après reset', async () => {
    const s1 = await getLoginAttemptService()
    _resetLoginAttemptServiceForTests()
    const s2 = await getLoginAttemptService()
    expect(s1).not.toBe(s2)
    expect(s2).toBeInstanceOf(NoopLoginAttemptService)
  })

  it('retourne une instance RedisLoginAttemptService quand les vars Upstash sont présentes', async () => {
    process.env['UPSTASH_REDIS_REST_URL'] = 'https://redis.upstash.io'
    process.env['UPSTASH_REDIS_REST_TOKEN'] = 'tok_test_secret'

    const svc = await getLoginAttemptService()
    expect(svc).toBeInstanceOf(RedisLoginAttemptService)
    expect(svc).not.toBeInstanceOf(NoopLoginAttemptService)
  })
})
