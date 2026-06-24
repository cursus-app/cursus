/**
 * Tests unitaires du composable useTwoFa.
 *
 * Strategie : mockNuxtImport() intercepte useSupabaseClient() sans instance Nuxt.
 * Chaque methode est testee pour son comportement nominal et ses cas d'erreur.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

// ─── Mock Supabase MFA ─────────────────────────────────────────────────────────

const mockMfa = {
  enroll: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
  challengeAndVerify: vi.fn(),
  unenroll: vi.fn(),
  listFactors: vi.fn(),
  getAuthenticatorAssuranceLevel: vi.fn(),
}

const mockSupabaseClient = { auth: { mfa: mockMfa } }

mockNuxtImport('useSupabaseClient', () => () => mockSupabaseClient)

// ─── Donnees de test ───────────────────────────────────────────────────────────

const FACTOR_ID = '00000000-0000-0000-0000-000000000001'
const CHALLENGE_ID = '00000000-0000-0000-0000-000000000002'
const TOTP_CODE = '123456'

const MOCK_ENROLL_DATA = {
  id: FACTOR_ID,
  type: 'totp' as const,
  totp: {
    qr_code: 'data:image/svg+xml;base64,abc123',
    secret: 'JBSWY3DPEHPK3PXP',
    uri: 'otpauth://totp/Cursus:test@test.com?secret=JBSWY3DPEHPK3PXP&issuer=Cursus',
  },
}

const MOCK_FACTORS_DATA = {
  totp: [
    {
      id: FACTOR_ID,
      status: 'verified' as const,
      friendly_name: 'My Authenticator',
      factor_type: 'totp' as const,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  phone: [],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useTwoFa — enroll()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne les donnees enrolement avec QR code et secret', async () => {
    mockMfa.enroll.mockResolvedValueOnce({ data: MOCK_ENROLL_DATA, error: null })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { enroll } = useTwoFa()
    const result = await enroll()

    expect(result).toEqual(MOCK_ENROLL_DATA)
    expect(mockMfa.enroll).toHaveBeenCalledWith({ factorType: 'totp' })
  })

  it('propage erreur Supabase si enrolement echoue', async () => {
    const supabaseError = new Error('Factor already exists')
    mockMfa.enroll.mockResolvedValueOnce({ data: null, error: supabaseError })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { enroll } = useTwoFa()

    await expect(enroll()).rejects.toThrow('Factor already exists')
  })
})

describe('useTwoFa — createChallenge()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne le challenge cree pour le facteur donne', async () => {
    const challengeData = { id: CHALLENGE_ID, type: 'totp', expires_at: 9999999999 }
    mockMfa.challenge.mockResolvedValueOnce({ data: challengeData, error: null })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { createChallenge } = useTwoFa()
    const result = await createChallenge(FACTOR_ID)

    expect(result).toEqual(challengeData)
    expect(mockMfa.challenge).toHaveBeenCalledWith({ factorId: FACTOR_ID })
  })

  it('propage erreur Supabase si le challenge echoue', async () => {
    const supabaseError = new Error('Factor not found')
    mockMfa.challenge.mockResolvedValueOnce({ data: null, error: supabaseError })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { createChallenge } = useTwoFa()

    await expect(createChallenge('invalid-id')).rejects.toThrow('Factor not found')
  })
})

describe('useTwoFa — verify()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne les donnees de session apres verification reussie', async () => {
    const sessionData = { user: { id: 'user-1' }, session: { access_token: 'tok' } }
    mockMfa.verify.mockResolvedValueOnce({ data: sessionData, error: null })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { verify } = useTwoFa()
    const result = await verify(FACTOR_ID, CHALLENGE_ID, TOTP_CODE)

    expect(result).toEqual(sessionData)
    expect(mockMfa.verify).toHaveBeenCalledWith({
      factorId: FACTOR_ID,
      challengeId: CHALLENGE_ID,
      code: TOTP_CODE,
    })
  })

  it('propage erreur si le code TOTP est invalide', async () => {
    const supabaseError = new Error('Invalid TOTP code')
    mockMfa.verify.mockResolvedValueOnce({ data: null, error: supabaseError })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { verify } = useTwoFa()

    await expect(verify(FACTOR_ID, CHALLENGE_ID, '000000')).rejects.toThrow('Invalid TOTP code')
  })
})

describe('useTwoFa — challengeAndVerify()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('resout avec les donnees de session si le code est correct', async () => {
    const sessionData = { user: { id: 'user-1' }, session: {} }
    mockMfa.challengeAndVerify.mockResolvedValueOnce({ data: sessionData, error: null })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { challengeAndVerify } = useTwoFa()
    const result = await challengeAndVerify(FACTOR_ID, TOTP_CODE)

    expect(result).toEqual(sessionData)
    expect(mockMfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: FACTOR_ID,
      code: TOTP_CODE,
    })
  })

  it('propage erreur Supabase (code invalide)', async () => {
    const supabaseError = new Error('Invalid TOTP code')
    mockMfa.challengeAndVerify.mockResolvedValueOnce({ data: null, error: supabaseError })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { challengeAndVerify } = useTwoFa()

    await expect(challengeAndVerify(FACTOR_ID, '999999')).rejects.toThrow('Invalid TOTP code')
  })

  it('propage erreur Supabase (code expire)', async () => {
    const supabaseError = new Error('TOTP code expired')
    mockMfa.challengeAndVerify.mockResolvedValueOnce({ data: null, error: supabaseError })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { challengeAndVerify } = useTwoFa()

    await expect(challengeAndVerify(FACTOR_ID, '123456')).rejects.toThrow('TOTP code expired')
  })
})

describe('useTwoFa — unenroll()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('desenrole le facteur avec succes', async () => {
    mockMfa.unenroll.mockResolvedValueOnce({ data: { id: FACTOR_ID }, error: null })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { unenroll } = useTwoFa()
    const result = await unenroll(FACTOR_ID)

    expect(result).toEqual({ id: FACTOR_ID })
    expect(mockMfa.unenroll).toHaveBeenCalledWith({ factorId: FACTOR_ID })
  })

  it('propage erreur Supabase si le desenrolement echoue', async () => {
    const supabaseError = new Error('Factor not found')
    mockMfa.unenroll.mockResolvedValueOnce({ data: null, error: supabaseError })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { unenroll } = useTwoFa()

    await expect(unenroll('nonexistent')).rejects.toThrow('Factor not found')
  })
})

describe('useTwoFa — listFactors()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne la liste des facteurs TOTP actifs', async () => {
    mockMfa.listFactors.mockResolvedValueOnce({ data: MOCK_FACTORS_DATA, error: null })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { listFactors } = useTwoFa()
    const result = await listFactors()

    expect(result).toEqual(MOCK_FACTORS_DATA)
    expect(result.totp).toHaveLength(1)
    expect(result.totp[0]?.['id']).toBe(FACTOR_ID)
    expect(result.totp[0]?.['status']).toBe('verified')
  })

  it('retourne une liste vide si aucun facteur enrole', async () => {
    mockMfa.listFactors.mockResolvedValueOnce({
      data: { totp: [], phone: [] },
      error: null,
    })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { listFactors } = useTwoFa()
    const result = await listFactors()

    expect(result.totp).toHaveLength(0)
  })

  it('propage erreur Supabase si listFactors echoue', async () => {
    const supabaseError = new Error('Network error')
    mockMfa.listFactors.mockResolvedValueOnce({ data: null, error: supabaseError })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { listFactors } = useTwoFa()

    await expect(listFactors()).rejects.toThrow('Network error')
  })
})

describe('useTwoFa — getAssuranceLevel()', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('retourne AAL1 si 2FA non requise', async () => {
    mockMfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce({
      data: { currentLevel: 'aal1', nextLevel: 'aal1', currentAuthenticationMethods: [] },
      error: null,
    })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { getAssuranceLevel } = useTwoFa()
    const result = await getAssuranceLevel()

    expect(result.currentLevel).toBe('aal1')
    expect(result.nextLevel).toBe('aal1')
  })

  it('retourne nextLevel AAL2 si la 2FA est requise (utilisateur enrole)', async () => {
    mockMfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce({
      data: { currentLevel: 'aal1', nextLevel: 'aal2', currentAuthenticationMethods: [] },
      error: null,
    })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { getAssuranceLevel } = useTwoFa()
    const result = await getAssuranceLevel()

    expect(result.currentLevel).toBe('aal1')
    expect(result.nextLevel).toBe('aal2')
  })

  it('propage erreur Supabase si appel echoue', async () => {
    const supabaseError = new Error('Unauthorized')
    mockMfa.getAuthenticatorAssuranceLevel.mockResolvedValueOnce({
      data: null,
      error: supabaseError,
    })

    const { useTwoFa } = await import('~/composables/useTwoFa')
    const { getAssuranceLevel } = useTwoFa()

    await expect(getAssuranceLevel()).rejects.toThrow('Unauthorized')
  })
})
