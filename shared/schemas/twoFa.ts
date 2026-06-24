import { z } from 'zod'

/**
 * Schémas Zod partagés client/serveur pour la 2FA TOTP.
 * Cf. ST-02.5 — 2FA TOTP (Premium MVP).
 */

/** Code TOTP 6 chiffres — ex: "123456" */
export const totpCodeSchema = z.object({
  code: z
    .string()
    .length(6, '2fa.errors.codeLength')
    .regex(/^\d{6}$/, '2fa.errors.codeNumeric'),
  factorId: z.string().uuid('2fa.errors.factorIdInvalid'),
})

/** Code de backup — format XXXXX-XXXXX-XXXXX-XXXXX (80 bits, hex majuscule) */
export const backupCodeSchema = z.object({
  code: z
    .string()
    .regex(/^[A-F0-9]{5}-[A-F0-9]{5}-[A-F0-9]{5}-[A-F0-9]{5}$/, '2fa.errors.backupCodeFormat'),
})

/** Désactivation 2FA : mot de passe + code TOTP requis */
export const disableTwoFaSchema = z.object({
  password: z.string().min(1, '2fa.errors.passwordRequired'),
  totpCode: z
    .string()
    .length(6, '2fa.errors.codeLength')
    .regex(/^\d{6}$/, '2fa.errors.codeNumeric'),
  factorId: z.string().uuid('2fa.errors.factorIdInvalid'),
})

export type TotpCodeInput = z.infer<typeof totpCodeSchema>
export type BackupCodeInput = z.infer<typeof backupCodeSchema>
export type DisableTwoFaInput = z.infer<typeof disableTwoFaSchema>
