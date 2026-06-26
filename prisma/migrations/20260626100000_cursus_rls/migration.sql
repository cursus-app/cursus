-- Migration : RLS policies pour les tables du module Cursus Builder.
-- Créé manuellement (--create-only) — pas de DDL Prisma, uniquement des POLICY.
--
-- Stratégie : deny by default.
-- Les tables cursus, cursus_versions et modules n'avaient pas de RLS dans la
-- migration initiale (elles étaient considérées comme non sensibles).
-- ST-03.1 les sécurise en conséquence.

-- ============================================================================
-- CI COMPAT : stub auth schema si absent (idempotent via IF NOT EXISTS)
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
-- ACTIVATION RLS
-- ============================================================================

ALTER TABLE cursus ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursus_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE : cursus
-- ============================================================================

-- Lecture : tous les cursus publiés sont accessibles publiquement.
CREATE POLICY "cursus_select_published" ON cursus
  FOR SELECT USING (status = 'PUBLISHED'::"CursusStatus");

-- Lecture : un formateur/admin voit ses propres cursus (tous statuts).
CREATE POLICY "cursus_select_own" ON cursus
  FOR SELECT USING (owner_id = auth.uid());

-- Lecture admin : voit tout.
CREATE POLICY "cursus_select_admin" ON cursus
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- Insert : réservé aux formateurs et admin.
CREATE POLICY "cursus_insert_formateur" ON cursus
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role IN (
          'FORMATEUR_PRINCIPAL'::"UserRole",
          'CO_FORMATEUR'::"UserRole",
          'ADMIN'::"UserRole"
        )
    )
  );

-- Update : propriétaire peut modifier ses propres cursus.
CREATE POLICY "cursus_update_own" ON cursus
  FOR UPDATE USING (owner_id = auth.uid());

-- Delete : propriétaire peut supprimer ses propres cursus.
CREATE POLICY "cursus_delete_own" ON cursus
  FOR DELETE USING (owner_id = auth.uid());

-- Admin : accès complet (toutes opérations).
CREATE POLICY "cursus_manage_admin" ON cursus
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- ============================================================================
-- TABLE : cursus_versions
-- ============================================================================

-- Lecture : accessible si le cursus parent est publié ou appartient à l'utilisateur.
CREATE POLICY "cursus_versions_select" ON cursus_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cursus c
      WHERE c.id = cursus_versions.cursus_id
        AND (
          c.status = 'PUBLISHED'::"CursusStatus"
          OR c.owner_id = auth.uid()
        )
    )
  );

-- Insert : seulement le propriétaire du cursus parent peut créer une version.
CREATE POLICY "cursus_versions_insert_owner" ON cursus_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cursus c
      WHERE c.id = cursus_versions.cursus_id
        AND c.owner_id = auth.uid()
    )
  );

-- Admin : accès complet.
CREATE POLICY "cursus_versions_admin" ON cursus_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );

-- ============================================================================
-- TABLE : modules
-- ============================================================================

-- Lecture : propriétaire du cursus parent.
CREATE POLICY "modules_select_owner" ON modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cursus c
      WHERE c.id = modules.cursus_id
        AND c.owner_id = auth.uid()
    )
  );

-- Lecture : stagiaire membre d'une cohorte utilisant ce cursus.
CREATE POLICY "modules_select_member" ON modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cursus_versions cv
      JOIN cohortes co ON co.cursus_version_id = cv.id
      JOIN memberships m ON m.cohorte_id = co.id
        AND m.user_id = auth.uid()
        AND m.left_at IS NULL
      WHERE cv.cursus_id = modules.cursus_id
    )
  );

-- Lecture : cursus publié → modules lisibles publiquement.
CREATE POLICY "modules_select_published" ON modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cursus c
      WHERE c.id = modules.cursus_id
        AND c.status = 'PUBLISHED'::"CursusStatus"
    )
  );

-- Gestion (ALL) : propriétaire du cursus parent.
CREATE POLICY "modules_manage_owner" ON modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cursus c
      WHERE c.id = modules.cursus_id
        AND c.owner_id = auth.uid()
    )
  );

-- Gestion (ALL) : admin.
CREATE POLICY "modules_manage_admin" ON modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'::"UserRole"
    )
  );
