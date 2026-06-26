/**
 * Tests RLS — table `modules`
 *
 * Scénarios couverts :
 *   - SELECT positif  : le propriétaire d'un cursus voit ses propres modules.
 *   - SELECT négatif  : formateurA NE VOIT PAS les modules d'un cursus DRAFT appartenant à formateurB.
 *   - SELECT négatif  : un stagiaire non-membre NE VOIT PAS les modules d'un cursus DRAFT.
 *   - UPDATE négatif  : formateurA NE PEUT PAS modifier les modules du cursus de formateurB.
 *   - DELETE négatif  : formateurA NE PEUT PAS supprimer les modules du cursus de formateurB.
 *
 * Politiques RLS testées (migration 20260626100000_cursus_rls) :
 *   - modules_select_owner  : SELECT WHERE cursus.owner_id = auth.uid()
 *   - modules_select_member : SELECT pour stagiaires membres d'une cohorte utilisant ce cursus
 *   - modules_select_published : SELECT si le cursus parent est PUBLISHED (non-couvert — DRAFT)
 *   - modules_manage_owner  : FOR ALL WHERE cursus.owner_id = auth.uid()
 *   - modules_manage_admin  : FOR ALL pour ADMIN
 *
 * Pré-requis : SUPABASE_TEST_DB_URL doit être défini (sinon tous les tests sont skippés).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { helpers, type TestUser } from './helpers';

const SKIP_IF_NO_DB = !process.env['SUPABASE_TEST_DB_URL'];

describe.skipIf(SKIP_IF_NO_DB)('RLS: modules', () => {
  let formateurA: TestUser;
  let formateurB: TestUser;
  let stagiaire: TestUser;
  let admin: TestUser;
  let cursusAId: string;
  let cursusBId: string;
  let moduleAId: string;
  let moduleBId: string;

  beforeAll(async () => {
    const ts = Date.now();

    // Deux formateurs (isolation via owner_id du cursus parent) et un stagiaire
    // sans membership (absence de cohorte garantit que modules_select_member ne s'applique pas).
    formateurA = await helpers.createTestUser(
      `fmtr-a-mod-${ts}@test.cursus.app`,
      'FORMATEUR_PRINCIPAL',
    );
    formateurB = await helpers.createTestUser(
      `fmtr-b-mod-${ts}@test.cursus.app`,
      'FORMATEUR_PRINCIPAL',
    );
    stagiaire = await helpers.createTestUser(`stg-mod-${ts}@test.cursus.app`, 'STAGIAIRE');
    admin = await helpers.createAdmin();

    // Cursus DRAFT pour chaque formateur (bypass RLS via service role).
    // Statut DRAFT intentionnel : les modules d'un cursus PUBLISHED sont lisibles
    // par tous (policy modules_select_published), ce qui invaliderait les tests négatifs.
    const { data: cursusA, error: errA } = await helpers.adminClient
      .from('cursus')
      .insert({
        title: `Cursus A Modules RLS ${ts}`,
        slug: `cursus-a-mod-${ts}`,
        domain: 'dev',
        level: 'BEGINNER',
        duration_weeks: 4,
        status: 'DRAFT',
        owner_id: formateurA.id,
      })
      .select('id')
      .single();
    if (errA != null || cursusA == null) {
      throw new Error(`cursusA insert failed: ${errA?.message ?? 'no data'}`);
    }
    cursusAId = cursusA.id as string;

    const { data: cursusB, error: errB } = await helpers.adminClient
      .from('cursus')
      .insert({
        title: `Cursus B Modules RLS ${ts}`,
        slug: `cursus-b-mod-${ts}`,
        domain: 'dev',
        level: 'BEGINNER',
        duration_weeks: 4,
        status: 'DRAFT',
        owner_id: formateurB.id,
      })
      .select('id')
      .single();
    if (errB != null || cursusB == null) {
      throw new Error(`cursusB insert failed: ${errB?.message ?? 'no data'}`);
    }
    cursusBId = cursusB.id as string;

    // Un module par cursus — créés via service role (bypass RLS).
    moduleAId = await helpers.createTestModule(cursusAId, 1);
    moduleBId = await helpers.createTestModule(cursusBId, 1);
  }, 60_000);

  afterAll(async () => {
    // Les modules cascade-delete via la FK Prisma (onDelete: Cascade sur Module → Cursus).
    await helpers.adminClient.from('cursus').delete().in('id', [cursusAId, cursusBId]);
    await Promise.all([
      helpers.deleteUser(formateurA.id),
      helpers.deleteUser(formateurB.id),
      helpers.deleteUser(stagiaire.id),
      helpers.deleteUser(admin.id),
    ]);
  }, 30_000);

  // -------------------------------------------------------------------------
  // SELECT
  // -------------------------------------------------------------------------

  describe('SELECT', () => {
    it('formateurA peut voir les modules de son propre cursus (test positif)', async () => {
      // Policy : modules_select_owner (cursus.owner_id = auth.uid())
      // Policy : modules_manage_owner  (FOR ALL — couvre aussi SELECT)
      const { data, error } = await formateurA.client
        .from('modules')
        .select('*')
        .eq('id', moduleAId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect((data ?? [])[0]?.id).toBe(moduleAId);
    });

    it('formateurA ne peut pas voir les modules du cursus DRAFT de formateurB (test négatif)', async () => {
      // Aucune policy ne correspond :
      //   - modules_select_owner  : cursusB.owner_id = formateurB.id → false pour formateurA
      //   - modules_manage_owner  : même condition → false
      //   - modules_select_published : cursusB.status = DRAFT → false
      //   - modules_select_member : aucun membership de formateurA dans une cohorte utilisant cursusB
      //   - modules_manage_admin  : formateurA n'est pas admin → false
      const { data, error } = await formateurA.client
        .from('modules')
        .select('*')
        .eq('id', moduleBId);

      expect(error).toBeNull();
      // RLS filtre silencieusement
      expect(data).toHaveLength(0);
    });

    it('un stagiaire sans membership ne peut pas voir les modules d un cursus DRAFT (test négatif)', async () => {
      // modules_select_member requiert un membership actif dans une cohorte
      // qui référence ce cursus via cursus_versions. Ici le stagiaire n'a aucun membership.
      const { data, error } = await stagiaire.client
        .from('modules')
        .select('id')
        .in('id', [moduleAId, moduleBId]);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('un admin peut voir les modules de tous les cursus', async () => {
      // Policy : modules_manage_admin (FOR ALL)
      const { data, error } = await admin.client
        .from('modules')
        .select('id')
        .in('id', [moduleAId, moduleBId]);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------

  describe('UPDATE', () => {
    it('formateurA peut modifier un module de son propre cursus (test positif)', async () => {
      // Policy : modules_manage_owner (FOR ALL WHERE cursus.owner_id = auth.uid())
      const newTitle = `Module A Renommé ${Date.now()}`;

      const { error } = await formateurA.client
        .from('modules')
        .update({ title: newTitle })
        .eq('id', moduleAId);

      expect(error).toBeNull();

      const { data } = await helpers.adminClient
        .from('modules')
        .select('title')
        .eq('id', moduleAId)
        .single();
      expect(data?.title).toBe(newTitle);
    });

    it('formateurA ne peut pas modifier les modules du cursus de formateurB (test négatif)', async () => {
      // modules_manage_owner : USING (cursusB.owner_id = auth.uid()) → false
      // → la ligne est invisible pour l'UPDATE (0 lignes modifiées, pas d'erreur)
      const { data: originalData } = await helpers.adminClient
        .from('modules')
        .select('title')
        .eq('id', moduleBId)
        .single();

      await formateurA.client
        .from('modules')
        .update({ title: 'Cross-owner module hack' })
        .eq('id', moduleBId);

      const { data } = await helpers.adminClient
        .from('modules')
        .select('title')
        .eq('id', moduleBId)
        .single();
      expect(data?.title).toBe(originalData?.title);
    });

    it('un stagiaire ne peut pas modifier un module (test négatif)', async () => {
      // Aucune policy UPDATE/ALL pour les stagiaires
      const { data: originalData } = await helpers.adminClient
        .from('modules')
        .select('title')
        .eq('id', moduleAId)
        .single();

      await stagiaire.client
        .from('modules')
        .update({ title: 'Hacked by stagiaire' })
        .eq('id', moduleAId);

      const { data } = await helpers.adminClient
        .from('modules')
        .select('title')
        .eq('id', moduleAId)
        .single();
      expect(data?.title).toBe(originalData?.title);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------------

  describe('DELETE', () => {
    it('formateurA ne peut pas supprimer les modules du cursus de formateurB (test négatif)', async () => {
      // modules_manage_owner : USING (cursusB.owner_id = auth.uid()) → false pour formateurA
      // → la ligne est invisible pour le DELETE (0 lignes supprimées, pas d'erreur)
      await formateurA.client.from('modules').delete().eq('id', moduleBId);

      // Le module de formateurB doit toujours exister
      const { data } = await helpers.adminClient
        .from('modules')
        .select('id')
        .eq('id', moduleBId)
        .single();
      expect(data?.id).toBe(moduleBId);
    });

    it('un stagiaire ne peut pas supprimer un module (test négatif)', async () => {
      // Aucune policy DELETE/ALL pour les stagiaires
      await stagiaire.client.from('modules').delete().eq('id', moduleAId);

      const { data } = await helpers.adminClient
        .from('modules')
        .select('id')
        .eq('id', moduleAId)
        .single();
      expect(data?.id).toBe(moduleAId);
    });
  });
});
