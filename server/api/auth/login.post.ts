// POST /api/auth/login — Login Supabase avec rate limiting + lockout compte.
// Cf. ST-15.4 TT-15.4.5.
//
// Flow :
//  1. Valider le body via loginSchema (Zod)
//  2. Rate limit par IP (5/min) — protège contre credential stuffing distribué
//  3. Vérifier si le compte est déjà verrouillé (isLocked) — avant d'interroger Supabase
//  4. Tenter le login Supabase
//  5. En cas d'échec : enregistrer la tentative, appliquer lockout si seuil atteint
//  6. En cas de succès : reset les compteurs
//
// Sécurité :
//  - Jamais d'email ou de password dans les logs (emails hashés SHA-256)
//  - Les erreurs "compte inexistant" vs "mauvais mdp" retournent le même message (anti-enumeration)
//  - IP rate limit : 5/min par IP (fenêtre glissante Redis)
//  - Compte lockout : 5/15min → 15min, 10/1h → 1h, 20/24h → 24h

import { serverSupabaseClient } from '#supabase/server'
import { hashEmail, hashId } from '~~/server/utils/hash'
import { getLoginAttemptService } from '~~/server/utils/loginAttemptService'
import { logger } from '~~/server/utils/logger'
import { loginSchema } from '~~/shared/schemas/auth'

export default defineEventHandler(async (event) => {
  // --- 1. Validation du body ---
  const body = await readValidatedBody(event, (raw) => loginSchema.parse(raw))
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const emailHash = hashEmail(body.email)
  const ipHash = hashId(ip)

  const service = await getLoginAttemptService()

  // --- 2. Rate limit par IP (5/min) — défense distribué ---
  const ipRateLimit = await service.checkIpRateLimit(ip)
  if (!ipRateLimit.allowed) {
    logger.warn({ ipHash, event: 'auth.login.ip_rate_limited' }, 'auth.login.ip_rate_limited')
    throw createError({
      statusCode: 429,
      message: 'Trop de tentatives depuis cette adresse. Réessaie dans 1 minute.',
    })
  }

  // --- 3. Pre-check : compte déjà verrouillé ? ---
  const lockStatus = await service.isLocked(body.email)
  if (lockStatus.locked) {
    logger.warn({ emailHash, ipHash, event: 'auth.login.blocked_locked' }, 'auth.login.blocked_locked')
    throw createError({
      statusCode: 429,
      message:
        'Compte temporairement verrouillé. Réessaie dans quelques minutes ou reset ton mot de passe.',
      data: lockStatus.lockedUntil
        ? { lockedUntil: lockStatus.lockedUntil.toISOString() }
        : undefined,
    })
  }

  // --- 4. Tentative login Supabase ---
  const supabase = await serverSupabaseClient(event)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  })

  // --- 5. Échec ---
  if (error !== null || !data.user) {
    const result = await service.checkAndRecord(body.email, ip, false)

    logger.info(
      { emailHash, ipHash, event: 'auth.login.failure', remainingAttempts: result.remainingAttempts },
      'auth.login.failure',
    )

    // Le seuil de lockout vient d'être atteint lors de cette tentative
    if (!result.allowed && result.lockedUntil) {
      logger.warn(
        { emailHash, event: 'auth.account.locked', lockedUntil: result.lockedUntil.toISOString() },
        'auth.account.locked',
      )
      throw createError({
        statusCode: 429,
        message: 'Compte temporairement verrouillé. Réessaie plus tard ou reset ton mot de passe.',
        data: { lockedUntil: result.lockedUntil.toISOString() },
      })
    }

    // Message générique — pas de leak sur la vraie raison (anti-enumeration)
    throw createError({ statusCode: 401, message: 'auth.errors.invalidCredentials' })
  }

  // --- 6. Succès ---
  await service.checkAndRecord(body.email, ip, true)
  logger.info({ userIdHash: hashId(data.user.id), event: 'auth.login.success' }, 'auth.login.success')

  return { user: { id: data.user.id, email: data.user.email } }
})
