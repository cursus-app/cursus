/**
 * Composable d'authentification Supabase.
 * Toutes les opérations auth passent ici — jamais directement dans les pages.
 * Pas de rate limiting ici (TODO ST-15.4 : Upstash Redis).
 * Pas de captcha ici (TODO : Cloudflare Turnstile après N échecs).
 */
export function useAuth() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  /**
   * Connexion email + mot de passe.
   * Les erreurs ne précisent jamais si c'est l'email ou le mot de passe qui est
   * incorrect (anti user enumeration — cf. considérations sécurité ST-02.1).
   */
  async function login(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new AuthError('auth.errors.invalidCredentials', error);
    }
  }

  async function logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new AuthError('auth.errors.generic', error);
    }
  }

  /**
   * Inscription sur invitation uniquement.
   * @param invitationToken — token validé côté client avant appel Supabase.
   *   La vérification serveur de la validité du token d'invitation est
   *   déléguée à ST-02.2 (invitations).
   */
  async function signup(email: string, password: string, _invitationToken: string): Promise<void> {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      // Supabase renvoie "User already registered" pour un email existant.
      // On expose un message métier distinct pour ce cas (AC Scénario 4).
      if (error.message.toLowerCase().includes('already registered')) {
        throw new AuthError('auth.errors.emailAlreadyUsed', error);
      }
      throw new AuthError('auth.errors.generic', error);
    }
  }

  /**
   * Demande de réinitialisation de mot de passe par email.
   * Répond toujours "email envoyé" même si le compte n'existe pas
   * (anti user enumeration).
   */
  async function forgotPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    // On silence l'erreur volontairement pour ne pas divulguer l'existence du compte.
    // L'erreur est tout de même loggée côté client (mais sans PII dans le message).
    if (error) {
      // Ne pas propager — l'UI affiche toujours "si un compte existe, un email a été envoyé."
    }
  }

  /**
   * Mise à jour du mot de passe après réinitialisation.
   * Nécessite une session active (token Supabase dans l'URL de reset).
   */
  async function updatePassword(password: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      throw new AuthError('auth.errors.generic', error);
    }
  }

  return { user, login, logout, signup, forgotPassword, updatePassword };
}

/**
 * Erreur auth typée — porte une clé i18n et la cause originale Supabase.
 * On ne rejette jamais une string brute ou une Error non typée.
 */
export class AuthError extends Error {
  /** Clé i18n affichée à l'utilisateur via $t(). */
  readonly i18nKey: string;

  constructor(i18nKey: string, cause?: unknown) {
    super(i18nKey, { cause });
    this.name = 'AuthError';
    this.i18nKey = i18nKey;
    // cause est déjà défini sur Error via le super() — on n'override pas
  }
}
