/**
 * Composable OAuth GitHub via Supabase Auth.
 * La connexion délègue entièrement à Supabase (pas de server OAuth custom).
 * La déconnexion efface le github_handle en DB via notre endpoint.
 */
export function useGitHubOAuth() {
  const supabase = useSupabaseClient();

  /**
   * Lance le flux OAuth GitHub.
   * Supabase redirige l'utilisateur vers GitHub, puis vers /auth/callback.
   * @param redirectTo — URL de retour après callback (défaut: /auth/callback)
   */
  async function connectGitHub(redirectTo?: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'read:user read:public_repo',
        redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      throw error;
    }
  }

  /**
   * Dissocie le compte GitHub.
   * Supabase ne supporte pas le "unlink" natif, on efface le handle en DB.
   */
  async function disconnectGitHub(): Promise<void> {
    await $fetch('/api/profile/github-disconnect', { method: 'POST' });
  }

  return { connectGitHub, disconnectGitHub };
}
