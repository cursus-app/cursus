-- Migration : RLS (Row Level Security) policies pour Supabase.
-- Créé manuellement car la DB locale n'est pas disponible en CI (--create-only).
--
-- Stratégie de sécurité :
--   - Deny by default : RLS activée sans policy = zéro ligne accessible.
--   - Policies explicites par rôle (SELECT uniquement pour la plupart).
--   - Le rôle Postgres `cursus_app` (utilisé par Prisma) est NON-superuser :
--     la RLS reste active sur ses requêtes (défense en profondeur).
--   - Les policies de modification de rôle sont bloquées (pas de self-escalation).
--   - Audit logs immuables : UPDATE/DELETE interdits même pour admin.
--
-- Pour Supabase : auth.uid() retourne le UUID de l'utilisateur authentifié via JWT.
-- Les casts ::text sont nécessaires car auth.uid() retourne uuid, id est uuid aussi
-- mais la comparaison directe uuid = uuid suffit ; on la documente explicitement.

-- ============================================================================
-- CI COMPAT : stub auth schema si absent (plain Postgres sans Supabase auth)
-- En production Supabase, auth.uid() existe déjà — les IF NOT EXISTS sont no-ops.
-- ============================================================================
DO $ci_compat$ BEGIN
  CREATE SCHEMA IF NOT EXISTS auth;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE $fn$
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $body$ SELECT '00000000-0000-0000-0000-000000000000'::uuid $body$
    $fn$;
  END IF;
END $ci_compat$;

-- ============================================================================
-- ACTIVATION RLS SUR TOUTES LES TABLES SENSIBLES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohortes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE harness_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tables non sensibles (pas de données utilisateur directes) : pas de RLS nécessaire.
-- cursus, cursus_versions, modules, quizzes, badges — accessibles en lecture publique
-- ou via la logique applicative. À revoir si des cursus deviennent privés.

-- ============================================================================
-- TABLE : users
-- ============================================================================

-- Un utilisateur peut voir et modifier son propre profil.
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid())
  -- Interdire l'auto-élévation de privilège : un user ne peut PAS modifier son
  -- propre global_role. Cette protection est complétée par le middleware Nitro.
  WITH CHECK (
    id = auth.uid()
    AND global_role IS NOT DISTINCT FROM (SELECT global_role FROM users WHERE id = auth.uid())
  );

-- Un formateur ou stagiaire peut voir les profils des membres de SES cohortes.
CREATE POLICY "users_select_cohorte_members" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m1
      JOIN memberships m2 ON m1.cohorte_id = m2.cohorte_id
      WHERE m1.user_id = id
        AND m2.user_id = auth.uid()
        AND m2.left_at IS NULL
        AND m1.left_at IS NULL
    )
  );

-- Un admin voit tous les profils.
CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users admin_u
      WHERE admin_u.id = auth.uid()
        AND admin_u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- Un admin peut modifier tous les profils (y compris changer les rôles).
CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users admin_u
      WHERE admin_u.id = auth.uid()
        AND admin_u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- ============================================================================
-- TABLE : memberships
-- ============================================================================

-- Un utilisateur voit ses propres memberships actifs.
CREATE POLICY "memberships_select_own" ON memberships
  FOR SELECT USING (user_id = auth.uid());

-- Un formateur voit les memberships de ses cohortes.
CREATE POLICY "memberships_select_formateur" ON memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.cohorte_id = memberships.cohorte_id
        AND m.user_id = auth.uid()
        AND m.role IN ('FORMATEUR_PRINCIPAL'::"MembershipRole", 'CO_FORMATEUR'::"MembershipRole")
        AND m.left_at IS NULL
    )
  );

-- Un admin voit tous les memberships.
CREATE POLICY "memberships_select_admin" ON memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- Un formateur principal peut gérer (INSERT/UPDATE) les memberships de ses cohortes.
CREATE POLICY "memberships_manage_formateur_principal" ON memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.cohorte_id = memberships.cohorte_id
        AND m.user_id = auth.uid()
        AND m.role = 'FORMATEUR_PRINCIPAL'::"MembershipRole"
        AND m.left_at IS NULL
    )
  );

-- Un admin peut tout gérer.
CREATE POLICY "memberships_manage_admin" ON memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- ============================================================================
-- TABLE : cohortes
-- ============================================================================

-- Un membre actif voit les cohortes auxquelles il appartient.
CREATE POLICY "cohortes_select_member" ON cohortes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.cohorte_id = id
        AND m.user_id = auth.uid()
        AND m.left_at IS NULL
    )
  );

-- Un admin voit toutes les cohortes.
CREATE POLICY "cohortes_select_admin" ON cohortes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- Un formateur principal peut gérer ses cohortes.
CREATE POLICY "cohortes_manage_formateur_principal" ON cohortes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.cohorte_id = id
        AND m.user_id = auth.uid()
        AND m.role = 'FORMATEUR_PRINCIPAL'::"MembershipRole"
        AND m.left_at IS NULL
    )
  );

-- Un admin peut gérer toutes les cohortes.
CREATE POLICY "cohortes_manage_admin" ON cohortes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- ============================================================================
-- TABLE : submissions
-- ============================================================================

-- Un stagiaire voit uniquement ses propres soumissions.
CREATE POLICY "submissions_select_own" ON submissions
  FOR SELECT USING (user_id = auth.uid());

-- Un stagiaire peut créer ses propres soumissions.
CREATE POLICY "submissions_insert_own" ON submissions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Un formateur voit les soumissions des stagiaires de ses cohortes.
-- La jointure passe par modules → cursus_versions → cohortes pour trouver
-- les membres de la même cohorte que le formateur.
CREATE POLICY "submissions_select_formateur" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m_formateur
      JOIN cohortes c ON c.id = m_formateur.cohorte_id
      JOIN memberships m_stagiaire
        ON m_stagiaire.cohorte_id = c.id
        AND m_stagiaire.user_id = submissions.user_id
        AND m_stagiaire.left_at IS NULL
      WHERE m_formateur.user_id = auth.uid()
        AND m_formateur.role IN ('FORMATEUR_PRINCIPAL'::"MembershipRole", 'CO_FORMATEUR'::"MembershipRole")
        AND m_formateur.left_at IS NULL
    )
  );

-- Un formateur principal peut mettre à jour les soumissions (override).
CREATE POLICY "submissions_update_formateur_principal" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships m_formateur
      JOIN cohortes c ON c.id = m_formateur.cohorte_id
      JOIN memberships m_stagiaire
        ON m_stagiaire.cohorte_id = c.id
        AND m_stagiaire.user_id = submissions.user_id
        AND m_stagiaire.left_at IS NULL
      WHERE m_formateur.user_id = auth.uid()
        AND m_formateur.role = 'FORMATEUR_PRINCIPAL'::"MembershipRole"
        AND m_formateur.left_at IS NULL
    )
  );

-- Un admin voit et gère toutes les soumissions.
CREATE POLICY "submissions_all_admin" ON submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- ============================================================================
-- TABLE : harness_runs
-- ============================================================================

-- Un utilisateur voit les runs de ses propres soumissions.
CREATE POLICY "harness_runs_select_own" ON harness_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions s
      WHERE s.id = harness_runs.submission_id
        AND s.user_id = auth.uid()
    )
  );

-- Un formateur voit les runs des soumissions de ses cohortes.
CREATE POLICY "harness_runs_select_formateur" ON harness_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions s
      JOIN memberships m_formateur
        ON m_formateur.user_id = auth.uid()
        AND m_formateur.role IN ('FORMATEUR_PRINCIPAL'::"MembershipRole", 'CO_FORMATEUR'::"MembershipRole")
        AND m_formateur.left_at IS NULL
      JOIN cohortes c ON c.id = m_formateur.cohorte_id
      JOIN memberships m_stagiaire
        ON m_stagiaire.cohorte_id = c.id
        AND m_stagiaire.user_id = s.user_id
        AND m_stagiaire.left_at IS NULL
      WHERE s.id = harness_runs.submission_id
    )
  );

-- Un admin voit tous les runs.
CREATE POLICY "harness_runs_select_admin" ON harness_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- ============================================================================
-- TABLE : alerts
-- ============================================================================

-- Un formateur voit les alertes des stagiaires de ses cohortes.
CREATE POLICY "alerts_select_formateur" ON alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m_formateur
      JOIN cohortes c ON c.id = m_formateur.cohorte_id
      JOIN memberships m_stagiaire
        ON m_stagiaire.cohorte_id = c.id
        AND m_stagiaire.user_id = alerts.user_id
        AND m_stagiaire.left_at IS NULL
      WHERE m_formateur.user_id = auth.uid()
        AND m_formateur.role IN ('FORMATEUR_PRINCIPAL'::"MembershipRole", 'CO_FORMATEUR'::"MembershipRole")
        AND m_formateur.left_at IS NULL
    )
  );

-- Un admin voit toutes les alertes.
CREATE POLICY "alerts_select_admin" ON alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- ============================================================================
-- TABLE : notifications
-- ============================================================================

-- Un utilisateur voit uniquement ses propres notifications.
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Un utilisateur peut marquer ses notifications comme lues (UPDATE readAt).
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TABLE : invitations
-- ============================================================================

-- Un utilisateur peut voir les invitations qui lui sont destinées (par email).
-- NB : auth.email() retourne l'email du JWT Supabase.
CREATE POLICY "invitations_select_own_email" ON invitations
  FOR SELECT USING (email = auth.email());

-- Un formateur principal peut voir les invitations de ses cohortes.
CREATE POLICY "invitations_select_formateur_principal" ON invitations
  FOR SELECT USING (
    cohorte_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.cohorte_id = invitations.cohorte_id
        AND m.user_id = auth.uid()
        AND m.role = 'FORMATEUR_PRINCIPAL'::"MembershipRole"
        AND m.left_at IS NULL
    )
  );

-- Un formateur principal peut créer des invitations pour ses cohortes.
CREATE POLICY "invitations_insert_formateur_principal" ON invitations
  FOR INSERT WITH CHECK (
    invited_by_id = auth.uid()
    AND (
      cohorte_id IS NULL
      OR EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.cohorte_id = invitations.cohorte_id
          AND m.user_id = auth.uid()
          AND m.role = 'FORMATEUR_PRINCIPAL'::"MembershipRole"
          AND m.left_at IS NULL
      )
    )
  );

-- Un admin gère toutes les invitations.
CREATE POLICY "invitations_all_admin" ON invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- ============================================================================
-- TABLE : audit_logs — IMMUABLE
-- ============================================================================

-- Seuls les admins peuvent lire les logs.
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- Interdire toute modification, même pour admin (immuabilité garantie par RLS).
CREATE POLICY "audit_logs_no_update" ON audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "audit_logs_no_delete" ON audit_logs
  FOR DELETE USING (false);

-- L'insertion est réservée au rôle serveur (cursus_app via Prisma).
-- Pas de policy INSERT pour auth.uid() → seul le backend peut créer des logs.
