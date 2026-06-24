-- Migration : RLS (Row Level Security) sur la table invitations
-- Cf. ST-02.2 — Considérations sécurité
-- Note : la table "invitations" a été créée dans 20260623232650_init.
--
-- Stratégie :
--   - SELECT  : formateurs de la cohorte ou admin global
--   - INSERT  : formateurs de la cohorte ou admin global
--   - UPDATE  : service role uniquement (mise à jour du token + acceptedAt via Prisma server)
--   - DELETE  : interdit

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

-- Activation de la RLS sur la table
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;

-- Formateurs et admins peuvent consulter les invitations des cohortes dont ils font partie
CREATE POLICY "invitations_select_formateur" ON "invitations"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m.user_id = auth.uid()
        AND m.cohorte_id = invitations.cohorte_id
        AND m.role IN ('FORMATEUR_PRINCIPAL', 'CO_FORMATEUR')
        AND m.left_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM "users" u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'
    )
  );

-- Formateurs et admins peuvent créer des invitations pour leurs cohortes
CREATE POLICY "invitations_insert_formateur" ON "invitations"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m.user_id = auth.uid()
        AND m.cohorte_id = invitations.cohorte_id
        AND m.role IN ('FORMATEUR_PRINCIPAL', 'CO_FORMATEUR')
        AND m.left_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM "users" u
      WHERE u.id = auth.uid()
        AND u.global_role = 'ADMIN'
    )
  );

-- Pas de UPDATE ni DELETE pour les utilisateurs
-- (les mises à jour se font via service role dans les endpoints Nitro)
CREATE POLICY "invitations_no_update" ON "invitations"
  FOR UPDATE
  USING (false);

CREATE POLICY "invitations_no_delete" ON "invitations"
  FOR DELETE
  USING (false);
