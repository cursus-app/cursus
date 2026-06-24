/**
 * POST /api/2fa/backup-codes
 *
 * Génère 8 nouveaux codes de backup (format XXXX-XXXX, hex majuscule).
 * - Les codes précédents sont supprimés (rotation complète).
 * - Seuls les hashes SHA-256 sont stockés en DB (les codes en clair sont
 *   retournés UNE SEULE FOIS et jamais conservés).
 * - Nécessite une session authentifiée.
 *
 * Cf. ST-02.5 — TT-02.5.5.
 */
import { serverSupabaseUser } from '#supabase/server'
import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import { logger } from '~~/server/utils/logger'

/** Format XXXX-XXXX (8 hex chars en 2 groupes de 4). */
function generateBackupCode(): string {
  const hex = randomBytes(4).toString('hex').toUpperCase()
  // regex /.{4}/g retourne toujours 2 groupes pour 8 chars — assertion de sécurité
  const groups = hex.match(/.{4}/g)
  if (!groups || groups.length !== 2) {
    throw new Error('[2fa] backup code generation failed — unexpected hex length')
  }
  return groups.join('-')
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const userId = user['id']
  const plainCodes = Array.from({ length: 8 }, generateBackupCode)

  // Rotation : supprimer les anciens codes, insérer les nouveaux en transaction.
  await prisma.$transaction([
    prisma.twoFaBackupCode.deleteMany({ where: { userId } }),
    prisma.twoFaBackupCode.createMany({
      data: plainCodes.map((code) => ({
        userId,
        codeHash: hashCode(code),
      })),
    }),
  ])

  logger.info({ userId }, '2fa.backup_codes.generated')

  // Les codes en clair sont retournés UNE SEULE FOIS — ne jamais les loguer.
  return { codes: plainCodes }
})
