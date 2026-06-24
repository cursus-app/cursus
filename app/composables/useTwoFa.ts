/**
 * Composable 2FA TOTP — wrapping Supabase MFA native API.
 *
 * Toutes les opérations 2FA passent par ici. Les erreurs Supabase sont
 * propagées telles quelles (pas de wrapping custom) car les messages
 * sont suffisamment génériques.
 *
 * Cf. ST-02.5 — 2FA TOTP (Premium MVP).
 */
export function useTwoFa() {
  const supabase = useSupabaseClient()

  /**
   * Enrôle une app TOTP : génère le secret + le QR code.
   * Retourne `{ id, type, totp: { qr_code, secret, uri } }`.
   * Le QR code est rendu côté client uniquement (jamais logué, jamais conservé).
   */
  async function enroll() {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) { throw error }
    return data
  }

  /**
   * Crée un challenge pour le facteur TOTP donné.
   * Le challenge est valide 10 minutes (côté Supabase).
   */
  async function createChallenge(factorId: string) {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId })
    if (error) { throw error }
    return data
  }

  /**
   * Vérifie un code TOTP dans le contexte d'un challenge existant.
   * Utilisé lors de l'enrôlement (validation du premier code).
   */
  async function verify(factorId: string, challengeId: string, code: string) {
    const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
    if (error) { throw error }
    return data
  }

  /**
   * Challenge + verify en 1 appel — pour le step de saisie TOTP au login.
   * Équivalent à createChallenge() + verify() mais sans exposer le challengeId.
   */
  async function challengeAndVerify(factorId: string, code: string) {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) { throw error }
    return data
  }

  /**
   * Désenrôle un facteur MFA (suppression côté Supabase).
   * Nécessite que l'utilisateur ait préalablement fourni son mot de passe + code TOTP.
   */
  async function unenroll(factorId: string) {
    const { data, error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) { throw error }
    return data
  }

  /**
   * Liste les facteurs MFA actifs de l'utilisateur connecté.
   * Retourne `{ totp: [...] }`.
   */
  async function listFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) { throw error }
    return data
  }

  /**
   * Retourne le niveau d'assurance actuel de l'authentificateur.
   * Permet de détecter si une 2FA challenge est requise après email/mot de passe.
   * - `currentLevel === 'aal1'` + `nextLevel === 'aal2'` → 2FA requis.
   */
  async function getAssuranceLevel() {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (error) { throw error }
    return data
  }

  return {
    enroll,
    createChallenge,
    verify,
    challengeAndVerify,
    unenroll,
    listFactors,
    getAssuranceLevel,
  }
}
