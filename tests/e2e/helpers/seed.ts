/**
 * Helpers de seeding DB pour les tests E2E Playwright.
 *
 * Nécessitent SUPABASE_SERVICE_ROLE_KEY dans l'environnement.
 * Silencieusement ignorés si la clé est absente (environnements sans DB réelle).
 *
 * À compléter progressivement : ST-02.1 (auth), ST-03.x (cursus), ST-04.x (cohortes).
 */

const hasServiceKey = Boolean(process.env['SUPABASE_SERVICE_ROLE_KEY']);

/**
 * Crée un utilisateur de test via l'API Supabase Admin.
 * Retourne null si SUPABASE_SERVICE_ROLE_KEY absent.
 */
export async function seedTestUser(
  email: string,
  password: string,
  role: 'STAGIAIRE' | 'FORMATEUR' | 'ADMIN' = 'STAGIAIRE',
): Promise<{ email: string; password: string; role: string } | null> {
  if (!hasServiceKey) {
    return null;
  }

  // TODO (ST-02.1 merged) : appeler /api/admin/seed-user avec le service role key
  // pour créer un compte Supabase Auth + entrée Prisma User.
  return { email, password, role };
}

/**
 * Supprime les données de test associées à un email.
 * No-op si SUPABASE_SERVICE_ROLE_KEY absent.
 */
export async function cleanTestData(email: string): Promise<void> {
  if (!hasServiceKey) {
    return;
  }

  // TODO (ST-02.1 merged) : appeler /api/admin/clean-test-data
  void email;
}

/**
 * Crée une cohorte de test avec un formateur et N stagiaires.
 * Retourne null si SUPABASE_SERVICE_ROLE_KEY absent.
 * Disponible dès ST-03.x + ST-04.x mergés.
 */
export async function seedTestCohort(options: {
  formateurEmail: string;
  stagiaireEmails: string[];
  cursusSlug: string;
}): Promise<{ cohortId: string } | null> {
  if (!hasServiceKey) {
    return null;
  }

  // TODO (ST-04.x merged) : seeder une cohorte complète pour les parcours E2E
  void options;
  return null;
}
