/**
 * Tests unitaires des schémas Zod 2FA (shared/schemas/twoFa.ts).
 */
import { describe, expect, it } from 'vitest'
import { totpCodeSchema, backupCodeSchema, disableTwoFaSchema } from '~~/shared/schemas/twoFa'

describe('totpCodeSchema', () => {
  const VALID_FACTOR_ID = '00000000-0000-0000-0000-000000000001'

  it('accepte un code TOTP valide à 6 chiffres', () => {
    const result = totpCodeSchema.safeParse({ code: '123456', factorId: VALID_FACTOR_ID })
    expect(result.success).toBe(true)
  })

  it('rejette un code de 5 chiffres', () => {
    const result = totpCodeSchema.safeParse({ code: '12345', factorId: VALID_FACTOR_ID })
    expect(result.success).toBe(false)
  })

  it('rejette un code de 7 chiffres', () => {
    const result = totpCodeSchema.safeParse({ code: '1234567', factorId: VALID_FACTOR_ID })
    expect(result.success).toBe(false)
  })

  it('rejette un code contenant des lettres', () => {
    const result = totpCodeSchema.safeParse({ code: '12345a', factorId: VALID_FACTOR_ID })
    expect(result.success).toBe(false)
  })

  it('rejette un code vide', () => {
    const result = totpCodeSchema.safeParse({ code: '', factorId: VALID_FACTOR_ID })
    expect(result.success).toBe(false)
  })

  it('rejette un factorId non-UUID', () => {
    const result = totpCodeSchema.safeParse({ code: '123456', factorId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepte le code "000000" (tout zéro — cas limite valide)', () => {
    const result = totpCodeSchema.safeParse({ code: '000000', factorId: VALID_FACTOR_ID })
    expect(result.success).toBe(true)
  })
})

describe('backupCodeSchema', () => {
  it('accepte un code de backup au format XXXXX-XXXXX-XXXXX-XXXXX (80 bits, hex majuscule)', () => {
    const result = backupCodeSchema.safeParse({ code: 'A1B2C-D3E4F-12345-ABCDE' })
    expect(result.success).toBe(true)
  })

  it('accepte un code entièrement numérique', () => {
    const result = backupCodeSchema.safeParse({ code: '12345-67890-12345-67890' })
    expect(result.success).toBe(true)
  })

  it('accepte un code entièrement alphabétique (hex)', () => {
    const result = backupCodeSchema.safeParse({ code: 'ABCDE-F0123-45678-9ABCD' })
    expect(result.success).toBe(true)
  })

  it('rejette un code en minuscule', () => {
    const result = backupCodeSchema.safeParse({ code: 'a1b2c-d3e4f-12345-abcde' })
    expect(result.success).toBe(false)
  })

  it('rejette un code sans tiret', () => {
    const result = backupCodeSchema.safeParse({ code: 'A1B2CD3E4F1234AABCDE' })
    expect(result.success).toBe(false)
  })

  it('rejette un code trop court (ancien format 8 chars)', () => {
    const result = backupCodeSchema.safeParse({ code: 'A1B2-C3' })
    expect(result.success).toBe(false)
  })

  it('rejette un code trop long', () => {
    const result = backupCodeSchema.safeParse({ code: 'A1B2C-D3E4F-12345-ABCDE-EXTRA' })
    expect(result.success).toBe(false)
  })

  it('rejette les caractères hors hex (G-Z)', () => {
    const result = backupCodeSchema.safeParse({ code: 'GHIJK-LMNOP-QRSTU-VWXYZ' })
    expect(result.success).toBe(false)
  })

  it('rejette un code vide', () => {
    const result = backupCodeSchema.safeParse({ code: '' })
    expect(result.success).toBe(false)
  })
})

describe('disableTwoFaSchema', () => {
  const VALID_FACTOR_ID = '00000000-0000-0000-0000-000000000001'

  it('accepte des données valides (mot de passe + code TOTP + factorId)', () => {
    const result = disableTwoFaSchema.safeParse({
      password: 'MySecurePass!1',
      totpCode: '654321',
      factorId: VALID_FACTOR_ID,
    })
    expect(result.success).toBe(true)
  })

  it('rejette un mot de passe vide', () => {
    const result = disableTwoFaSchema.safeParse({
      password: '',
      totpCode: '654321',
      factorId: VALID_FACTOR_ID,
    })
    expect(result.success).toBe(false)
  })

  it('rejette un code TOTP invalide (5 chiffres)', () => {
    const result = disableTwoFaSchema.safeParse({
      password: 'MyPass',
      totpCode: '12345',
      factorId: VALID_FACTOR_ID,
    })
    expect(result.success).toBe(false)
  })

  it('rejette un factorId non-UUID', () => {
    const result = disableTwoFaSchema.safeParse({
      password: 'MyPass',
      totpCode: '123456',
      factorId: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})
