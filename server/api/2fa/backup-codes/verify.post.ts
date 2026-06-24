/**
 * POST /api/2fa/backup-codes/verify
 *
 * Vérifie un code de backup et le consomme (usage unique).
 * - Le code fourni est hashé (SHA-256) et comparé aux hashes stockés.
 * - Un code déjà consommé (usedAt != null) est rejeté.
 * - Retourne 401 si le code est invalide ou déjà consommé (message générique
 *   pour éviter de distinguer "code inconnu" de "code déjà utilisé").
 *
 * Cf. ST-02.5 — Scénario 3 (Récupération via code de backup).
 */
import { serverSupabaseUser } from '#supabase/server'
import { createHash } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import { logger } from '~~/server/utils/logger'
import { backupCodeSchema } from '~~/shared/schemas/twoFa'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = user['id']
  const body = await readValidatedBody(event, (raw) => backupCodeSchema.parse(raw))
  const codeHash = createHash('sha256').update(body.code).digest('hex')

  // Consommation atomique : une seule opération DB (pas de TOCTOU).
  // updateMany retourne { count: 1 } si et seulement si un code non consommé correspond.
  const result = await prisma.twoFaBackupCode.updateMany({
    where: { userId, codeHash, usedAt: null },
    data: { usedAt: new Date() },
  })

  if (result.count !== 1) {
    // Message générique intentionnel : ne pas distinguer "inconnu" de "déjà utilisé"
    logger.warn({ userId }, '2fa.backup_code.invalid')
    throw createError({ statusCode: 401, message: 'Code de backup invalide ou déjà utilisé' })
  }

  logger.warn({ userId }, '2fa.backup_code.used')

  return { success: true }
})
