/**
 * Helpers RLS — tests d'intégration Supabase Row Level Security.
 *
 * Ces helpers créent des utilisateurs et des données de test via le service role
 * (bypass RLS) pour le setup, puis fournissent des clients authentifiés (JWT
 * utilisateur) pour valider que RLS est correctement appliquée.
 *
 * Pré-requis : variables d'environnement
 *   SUPABASE_URL              — URL de l'instance Supabase de test
 *   SUPABASE_ANON_KEY         — clé anon (utilisée pour les clients utilisateur)
 *   SUPABASE_SERVICE_ROLE_KEY — clé service role (bypass RLS, pour le setup)
 *   SUPABASE_TEST_DB_URL      — URL Postgres directe (skip guard)
 *
 * IMPORTANT : Ces tests s'exécutent contre une vraie instance Supabase.
 * Ils ne doivent JAMAIS cibler la base de production.
 *
 * Design : les clients Supabase sont créés en lazy (jamais au niveau module)
 * pour que describe.skipIf puisse évaluer SKIP_IF_NO_DB AVANT toute connexion
 * réseau. Sans cela, `createClient` avec une URL vide lancerait une erreur
 * au moment de l'import, avant même que le skip soit évalué.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestUser {
  id: string;
  email: string;
  /** Client Supabase authentifié avec le JWT de cet utilisateur (RLS active). */
  client: SupabaseClient;
}

export interface TwoTenantsFixture {
  alice: TestUser;
  aliceCohorteId: string;
  bob: TestUser;
  bobCohorteId: string;
}

export interface SubmissionRow {
  id: string;
  user_id: string;
  module_id: string;
  repo_url: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Clients Supabase (lazy — jamais initialisés au niveau module)
// ---------------------------------------------------------------------------

/**
 * Lecture des variables d'environnement au moment de l'appel.
 * Évite de planter à l'import quand les variables sont absentes.
 */
function getEnv() {
  return {
    url: process.env['SUPABASE_URL'] ?? '',
    serviceKey: process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '',
    anonKey: process.env['SUPABASE_ANON_KEY'] ?? '',
  };
}

let _adminClient: SupabaseClient | null = null;

/**
 * Accessor lazy pour le client admin (service role — bypass RLS).
 * Créé une seule fois à la première utilisation.
 * Utilisé UNIQUEMENT pour le setup et le teardown des fixtures.
 */
function getAdminClient(): SupabaseClient {
  if (_adminClient == null) {
    const { url, serviceKey } = getEnv();
    _adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  }
  return _adminClient;
}

// ---------------------------------------------------------------------------
// Seed helpers (fonctions privées — exposées via l'objet `helpers`)
// ---------------------------------------------------------------------------

/**
 * Crée un utilisateur Supabase Auth + profil dans la table `users`.
 * Retourne un client authentifié sous JWT de cet utilisateur (RLS active).
 */
async function createTestUser(
  email: string,
  globalRole: 'STAGIAIRE' | 'FORMATEUR_PRINCIPAL' | 'CO_FORMATEUR' | 'ADMIN' = 'STAGIAIRE',
): Promise<TestUser> {
  const admin = getAdminClient();

  // 1. Créer le compte Auth
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: 'TestPassword123!',
    email_confirm: true,
  });
  if (authError != null || authData.user == null) {
    throw new Error(
      `createTestUser auth failed for ${email}: ${authError?.message ?? 'no user returned'}`,
    );
  }

  const userId = authData.user.id;

  // 2. Créer le profil dans la table users
  const { error: profileError } = await admin.from('users').insert({
    id: userId,
    email,
    global_role: globalRole,
    full_name: `Test ${globalRole}`,
  });
  if (profileError != null) {
    throw new Error(`createTestUser profile failed for ${email}: ${profileError.message}`);
  }

  // 3. Générer un lien magique pour vérifier que l'Auth fonctionne
  //    (on n'a pas besoin du token lui-même : on va utiliser signInWithPassword)
  const { error: tokenError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (tokenError != null) {
    throw new Error(`createTestUser generateLink failed for ${email}: ${tokenError.message}`);
  }

  // 4. Créer un client utilisateur et s'authentifier par mot de passe
  //    Ce client portera le JWT de l'utilisateur → RLS active.
  const { anonKey, url } = getEnv();
  const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password: 'TestPassword123!',
  });
  if (signInError != null) {
    throw new Error(`createTestUser signIn failed for ${email}: ${signInError.message}`);
  }

  return { id: userId, email, client: userClient };
}

/**
 * Crée une cohorte de test (+ cursus + version minimaux) via service role.
 */
async function createTestCohorte(nameSuffix: string): Promise<string> {
  const admin = getAdminClient();
  const ts = Date.now();

  // Cursus minimal
  const { data: cursusData, error: cursusError } = await admin
    .from('cursus')
    .insert({
      title: `Test Cursus ${nameSuffix}`,
      slug: `test-cursus-${nameSuffix}-${ts}`,
      domain: 'test',
      level: 'BEGINNER',
      duration_weeks: 4,
      status: 'PUBLISHED',
      owner_id: '00000000-0000-0000-0000-000000000000',
    })
    .select('id')
    .single();
  if (cursusError != null || cursusData == null) {
    throw new Error(`createTestCohorte cursus failed: ${cursusError?.message ?? 'no data'}`);
  }

  // Version cursus minimale
  const { data: versionData, error: versionError } = await admin
    .from('cursus_versions')
    .insert({
      cursus_id: cursusData.id,
      version: 1,
      snapshot_json: {},
    })
    .select('id')
    .single();
  if (versionError != null || versionData == null) {
    throw new Error(`createTestCohorte version failed: ${versionError?.message ?? 'no data'}`);
  }

  const todayParts = new Date().toISOString().split('T');
  const today = todayParts[0] ?? new Date().toISOString().slice(0, 10);
  const nextMonthParts = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T');
  const nextMonth =
    nextMonthParts[0] ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: cohorteData, error: cohorteError } = await admin
    .from('cohortes')
    .insert({
      cursus_version_id: versionData.id,
      name: `Cohorte ${nameSuffix} ${ts}`,
      start_date: today,
      end_date: nextMonth,
      rhythm: 'WEEKLY',
      status: 'ACTIVE',
    })
    .select('id')
    .single();
  if (cohorteError != null || cohorteData == null) {
    throw new Error(
      `createTestCohorte cohorte insert failed: ${cohorteError?.message ?? 'no data'}`,
    );
  }

  return cohorteData.id as string;
}

/**
 * Inscrit un utilisateur dans une cohorte avec un rôle donné.
 */
async function addMembership(
  userId: string,
  cohorteId: string,
  role: 'STAGIAIRE' | 'FORMATEUR_PRINCIPAL' | 'CO_FORMATEUR',
): Promise<void> {
  const { error } = await getAdminClient().from('memberships').insert({
    user_id: userId,
    cohorte_id: cohorteId,
    role,
  });
  if (error != null) {
    throw new Error(
      `addMembership failed (userId=${userId}, cohorteId=${cohorteId}): ${error.message}`,
    );
  }
}

/**
 * Crée un module de test minimal dans un cursus.
 */
async function createTestModule(cursusId: string, week: number = 1): Promise<string> {
  const { data, error } = await getAdminClient()
    .from('modules')
    .insert({
      cursus_id: cursusId,
      week,
      title: `Module test semaine ${week}`,
      objectives: 'Objectifs de test',
      resources_json: [],
      deliverable_spec_json: { type: 'repo', required_files: ['README.md'] },
      xp_reward: 100,
    })
    .select('id')
    .single();
  if (error != null || data == null) {
    throw new Error(`createTestModule failed: ${error?.message ?? 'no data'}`);
  }
  return data.id as string;
}

// ---------------------------------------------------------------------------
// Fixtures de haut niveau (objet `helpers` exporté)
// ---------------------------------------------------------------------------

export const helpers = {
  /**
   * Getter pour le client admin lazy.
   * Exposé pour les specs qui ont besoin de vérifier via service role.
   */
  get adminClient(): SupabaseClient {
    return getAdminClient();
  },

  createTestUser,
  createTestCohorte,
  addMembership,
  createTestModule,

  /**
   * Seed principal : 2 stagiaires dans des cohortes complètement séparées.
   * Retourne le contexte complet pour les tests d'isolation multi-tenant.
   */
  async seedTwoTenants(): Promise<TwoTenantsFixture> {
    const ts = Date.now();

    const alice = await createTestUser(`alice-${ts}@test.cursus.app`, 'STAGIAIRE');
    const bob = await createTestUser(`bob-${ts}@test.cursus.app`, 'STAGIAIRE');

    const aliceCohorteId = await createTestCohorte(`A-${ts}`);
    const bobCohorteId = await createTestCohorte(`B-${ts}`);

    await addMembership(alice.id, aliceCohorteId, 'STAGIAIRE');
    await addMembership(bob.id, bobCohorteId, 'STAGIAIRE');

    return { alice, aliceCohorteId, bob, bobCohorteId };
  },

  /**
   * Crée un formateur principal dans une cohorte donnée.
   */
  async createFormateur(cohorteId: string): Promise<TestUser> {
    const ts = Date.now();
    const formateur = await createTestUser(
      `formateur-${ts}@test.cursus.app`,
      'FORMATEUR_PRINCIPAL',
    );
    await addMembership(formateur.id, cohorteId, 'FORMATEUR_PRINCIPAL');
    return formateur;
  },

  /**
   * Crée un co-formateur dans une cohorte donnée.
   */
  async createCoFormateur(cohorteId: string): Promise<TestUser> {
    const ts = Date.now();
    const coFormateur = await createTestUser(`co-formateur-${ts}@test.cursus.app`, 'CO_FORMATEUR');
    await addMembership(coFormateur.id, cohorteId, 'CO_FORMATEUR');
    return coFormateur;
  },

  /**
   * Crée un administrateur global (aucune cohorte).
   */
  async createAdmin(): Promise<TestUser> {
    const ts = Date.now();
    return createTestUser(`admin-${ts}@test.cursus.app`, 'ADMIN');
  },

  /**
   * Crée une submission via service role (bypass RLS) pour le setup.
   */
  async createSubmission(userId: string, moduleId: string): Promise<SubmissionRow> {
    const { data, error } = await getAdminClient()
      .from('submissions')
      .insert({
        user_id: userId,
        module_id: moduleId,
        repo_url: `https://github.com/test/${userId.slice(0, 8)}`,
        status: 'PENDING',
        attempt_number: 1,
      })
      .select()
      .single();
    if (error != null || data == null) {
      throw new Error(`createSubmission failed: ${error?.message ?? 'no data'}`);
    }
    return data as SubmissionRow;
  },

  /**
   * Supprime un utilisateur (Auth + profil DB).
   * La cascade FK supprime ses données associées.
   */
  async deleteUser(userId: string): Promise<void> {
    const admin = getAdminClient();
    await admin.from('users').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
  },

  /**
   * Supprime une cohorte et ses dépendances.
   */
  async deleteCohorte(cohorteId: string): Promise<void> {
    await getAdminClient().from('cohortes').delete().eq('id', cohorteId);
  },

  /**
   * Nettoyage complet d'un seed two-tenants.
   */
  async cleanTwoTenants(fixture: TwoTenantsFixture): Promise<void> {
    await Promise.all([
      helpers.deleteUser(fixture.alice.id),
      helpers.deleteUser(fixture.bob.id),
      helpers.deleteCohorte(fixture.aliceCohorteId),
      helpers.deleteCohorte(fixture.bobCohorteId),
    ]);
  },

  /**
   * Signe un utilisateur hors de sa session (déconnexion propre).
   */
  async signOut(user: TestUser): Promise<void> {
    await user.client.auth.signOut();
  },
};
