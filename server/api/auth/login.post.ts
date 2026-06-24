// POST /api/auth/login — Login Supabase avec rate limiting + lockout compte.
// Cf. ST-15.4 TT-15.4.5.
//
// Flow :
//  1. Valider le body via loginSchema (Zod)
//  2. Vérifier si le compte est déjà verrouillé (isLocked) — avant d'interroger Supabase
//  3. Tenter le login Supabase
//  4. En cas d'échec : enregistrer la tentative, appliquer lockout si seuil atteint
//  5. En cas de succès : reset les compteurs
//
// Sécurité :
//  - Jamais d'email ou de password dans les logs
//  - Les erreurs "compte inexistant" vs "mauvais mdp" retournent le même message (anti-enumeration)
//  - Constant-time behavior : on tente toujours Supabase même si on sait qu'on va échouer
//    (le lockout pré-check renvoie 429 avant — acceptable car le lockout lui-même révèle l'existence)

import { serverSupabaseClient } from '#supabase/server'
import { hashEmail } from '~~/server/utils/hash'
import { getLoginAttemptService } from '~~/server/utils/loginAttemptService'
import { logger } from '~~/server/utils/logger'
import { loginSchema } from '~~/shared/schemas/auth'

export default defineEventHandler(async (event) => {
  // --- 1. Validation du body ---
  const body = await readValidatedBody(event, (raw) => loginSchema.parse(raw))
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const emailHash = hashEmail(body.email)

  const service = await getLoginAttemptService()

  // --- 2. Pre-check : compte déjà verrouillé ? ---
  const lockStatus = await service.isLocked(body.email)
  if (lockStatus.locked) {
    logger.warn(
      { emailHash, event: 'auth.login.blocked_locked' },
      'auth.login.blocked_locked',
    )
    throw createError({
      statusCode: 429,
      message:
        'Compte temporairement verrouillé. Réessaie dans quelques minutes ou reset ton mot de passe.',
      data: lockStatus.lockedUntil
        ? { lockedUntil: lockStatus.lockedUntil.toISOString() }
        : undefined,
    })
  }

  // --- 3. Tentative login Supabase ---
  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  })

  // --- 4. Échec ---
  if (error ?? !data.user) {
    const result = await service.checkAndRecord(body.email, ip, false)

    logger.info(
      {
        emailHash,
        event: 'auth.login.failure',
        remainingAttempts: result.remainingAttempts,
      },
      'auth.login.failure',
    )

    // Le seuil de lockout vient d'être atteint lors de cette tentative
    if (!result.allowed && result.lockedUntil) {
      logger.warn(
        {
          emailHash,
          event: 'auth.account.locked',
          lockedUntil: result.lockedUntil.toISOString(),
        },
        'auth.account.locked',
      )
      throw createError({
        statusCode: 429,
        message:
          'Compte temporairement verrouillé. Réessaie plus tard ou reset ton mot de passe.',
        data: { lockedUntil: result.lockedUntil.toISOString() },
      })
    }

    // Message générique — pas de leak sur la vraie raison (anti-enumeration)
    throw createError({
      statusCode: 401,
      message: 'auth.errors.invalidCredentials',
    })
  }

  // --- 5. Succès ---
  await service.checkAndRecord(body.email, ip, true)
  logger.info({ userId: data.user.id, event: 'auth.login.success' }, 'auth.login.success')

  return { user: { id: data.user.id, email: data.user.email } }
})
