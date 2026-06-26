/**
 * Tests RLS — table `cursus`
 *
 * Scénarios couverts :
 *   - SELECT positif  : un formateur voit ses propres cursus (tous statuts via owner_id).
 *   - SELECT négatif  : un formateur NE VOIT PAS les cursus DRAFT d'un autre formateur.
 *   - SELECT négatif  : un stagiaire NE VOIT PAS les cursus DRAFT.
 *   - UPDATE positif  : un formateur peut modifier son propre cursus.
 *   - UPDATE négatif  : un formateur NE PEUT PAS modifier le cursus d'un autre.
 *   - UPDATE négatif  : un stagiaire NE PEUT PAS modifier un cursus.
 *   - DELETE négatif  : un formateur NE PEUT PAS supprimer le cursus d'un autre.
 *   - DELETE négatif  : un stagiaire NE PEUT PAS supprimer un cursus.
 *
 * Politiques RLS testées (migration 20260626100000_cursus_rls) :
 *   - cursus_select_own      : SELECT WHERE owner_id = auth.uid()
 *   - cursus_select_published: SELECT WHERE status = 'PUBLISHED' (non-couvert ici — DRAFT uniquement)
 *   - cursus_update_own      : UPDATE WHERE owner_id = auth.uid()
 *   - cursus_delete_own      : DELETE WHERE owner_id = auth.uid()
 *   - cursus_manage_admin    : FOR ALL pour ADMIN (test positif admin)
 *
 * Pré-requis : SUPABASE_TEST_DB_URL doit être défini (sinon tous les tests sont skippés).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { helpers, type TestUser } from './helpers';

const SKIP_IF_NO_DB = !process.env['SUPABASE_TEST_DB_URL'];

describe.skipIf(SKIP_IF_NO_DB)('RLS: cursus', () => {
  let formateurA: TestUser;
  let formateurB: TestUser;
  let stagiaire: TestUser;
  let admin: TestUser;
  let cursusAId: string;
  let cursusBId: string;

  beforeAll(async () => {
    const ts = Date.now();

    // Créer deux formateurs et un stagiaire sans cohorte.
    // L'isolation cursus est basée sur owner_id, pas sur les memberships.
    formateurA = await helpers.createTestUser(
      `fmtr-a-${ts}@test.cursus.app`,
      'FORMATEUR_PRINCIPAL',
    );
    formateurB = await helpers.createTestUser(
      `fmtr-b-${ts}@test.cursus.app`,
      'FORMATEUR_PRINCIPAL',
    );
    stagiaire = await helpers.createTestUser(`stg-${ts}@test.cursus.app`, 'STAGIAIRE');
    admin = await helpers.createAdmin();

    // Créer un cursus DRAFT pour chaque formateur via service role (bypass RLS).
    // Statut DRAFT est intentionnel : les cursus PUBLISHED sont accessibles à tous
    // (policy cursus_select_published), ce qui rendrait les tests négatifs inopérants.
    const { data: cursusA, error: errA } = await helpers.adminClient
      .from('cursus')
      .insert({
        title: `Cursus A RLS Test ${ts}`,
        slug: `cursus-a-rls-${ts}`,
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
        title: `Cursus B RLS Test ${ts}`,
        slug: `cursus-b-rls-${ts}`,
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
  }, 60_000);

  afterAll(async () => {
    // Les modules cascade-delete via la FK Prisma (onDelete: Cascade).
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
    it('formateurA peut voir son propre cursus DRAFT (test positif)', async () => {
      // Policy : cursus_select_own (owner_id = auth.uid())
      const { data, error } = await formateurA.client
        .from('cursus')
        .select('*')
        .eq('id', cursusAId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect((data ?? [])[0]?.id).toBe(cursusAId);
    });

    it('formateurA ne peut pas voir le cursus DRAFT de formateurB (test négatif)', async () => {
      // Aucune policy ne correspond :
      //   - cursus_select_own : owner_id != formateurA.id → false
      //   - cursus_select_published : status = DRAFT → false
      //   - cursus_select_admin : formateurA n'est pas admin → false
      const { data, error } = await formateurA.client
        .from('cursus')
        .select('*')
        .eq('id', cursusBId);

      expect(error).toBeNull();
      // RLS filtre silencieusement — 0 résultat au lieu d'une erreur
      expect(data).toHaveLength(0);
    });

    it('un stagiaire ne peut pas voir les cursus DRAFT (test négatif)', async () => {
      // Aucune policy SELECT ne s'applique au stagiaire sur des cursus DRAFT.
      const { data, error } = await stagiaire.client
        .from('cursus')
        .select('id')
        .in('id', [cursusAId, cursusBId]);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('un admin peut voir tous les cursus', async () => {
      // Policy : cursus_select_admin + cursus_manage_admin
      const { data, error } = await admin.client
        .from('cursus')
        .select('id')
        .in('id', [cursusAId, cursusBId]);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------

  describe('UPDATE', () => {
    it('formateurA peut modifier son propre cursus (test positif)', async () => {
      // Policy : cursus_update_own (owner_id = auth.uid())
      const newTitle = `Cursus A Renommé ${Date.now()}`;

      const { error } = await formateurA.client
        .from('cursus')
        .update({ title: newTitle })
        .eq('id', cursusAId);

      expect(error).toBeNull();

      const { data } = await helpers.adminClient
        .from('cursus')
        .select('title')
        .eq('id', cursusAId)
        .single();
      expect(data?.title).toBe(newTitle);
    });

    it('formateurA ne peut pas modifier le cursus de formateurB (test négatif)', async () => {
      // Policy cursus_update_own : USING (owner_id = auth.uid()) → condition false
      // → la ligne est invisible pour l'UPDATE (0 lignes modifiées, pas d'erreur)
      const { data: originalData } = await helpers.adminClient
        .from('cursus')
        .select('title')
        .eq('id', cursusBId)
        .single();

      await formateurA.client
        .from('cursus')
        .update({ title: 'Cross-owner hack attempt' })
        .eq('id', cursusBId);

      const { data } = await helpers.adminClient
        .from('cursus')
        .select('title')
        .eq('id', cursusBId)
        .single();
      expect(data?.title).toBe(originalData?.title);
    });

    it('un stagiaire ne peut pas modifier un cursus (test négatif)', async () => {
      // Aucune policy UPDATE/ALL pour les stagiaires → 0 lignes modifiées
      const { data: originalData } = await helpers.adminClient
        .from('cursus')
        .select('title')
        .eq('id', cursusAId)
        .single();

      await stagiaire.client
        .from('cursus')
        .update({ title: 'Hacked by stagiaire' })
        .eq('id', cursusAId);

      const { data } = await helpers.adminClient
        .from('cursus')
        .select('title')
        .eq('id', cursusAId)
        .single();
      expect(data?.title).toBe(originalData?.title);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------------

  describe('DELETE', () => {
    it('formateurA ne peut pas supprimer le cursus de formateurB (test négatif)', async () => {
      // Policy cursus_delete_own : USING (owner_id = auth.uid()) → false pour cursusBId
      // → la ligne est invisible pour le DELETE (0 lignes supprimées, pas d'erreur)
      await formateurA.client.from('cursus').delete().eq('id', cursusBId);

      // Le cursus de formateurB doit toujours exister
      const { data } = await helpers.adminClient
        .from('cursus')
        .select('id')
        .eq('id', cursusBId)
        .single();
      expect(data?.id).toBe(cursusBId);
    });

    it('un stagiaire ne peut pas supprimer un cursus (test négatif)', async () => {
      // Aucune policy DELETE/ALL pour les stagiaires → 0 lignes supprimées
      await stagiaire.client.from('cursus').delete().eq('id', cursusAId);

      const { data } = await helpers.adminClient
        .from('cursus')
        .select('id')
        .eq('id', cursusAId)
        .single();
      expect(data?.id).toBe(cursusAId);
    });
  });
});
