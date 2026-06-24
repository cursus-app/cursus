/**
 * Tests RLS — table `cohortes`
 *
 * Scénarios couverts :
 *   - SELECT : un membre ne voit que les cohortes auxquelles il appartient.
 *   - INSERT : seul un ADMIN peut créer une cohorte (pas un stagiaire ou formateur).
 *   - UPDATE : un formateur principal peut modifier sa cohorte, pas une autre.
 *   - DELETE : personne sauf ADMIN ne peut supprimer une cohorte.
 *
 * Pré-requis : SUPABASE_TEST_DB_URL doit être défini (sinon tous les tests sont skippés).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { helpers, type TwoTenantsFixture, type TestUser } from './helpers';

const SKIP_IF_NO_DB = !process.env['SUPABASE_TEST_DB_URL'];

describe.skipIf(SKIP_IF_NO_DB)('RLS: cohortes', () => {
  let fixture: TwoTenantsFixture;
  let aliceFormateur: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    fixture = await helpers.seedTwoTenants();
    aliceFormateur = await helpers.createFormateur(fixture.aliceCohorteId);
    admin = await helpers.createAdmin();
  }, 60_000);

  afterAll(async () => {
    await Promise.all([
      helpers.cleanTwoTenants(fixture),
      helpers.deleteUser(aliceFormateur.id),
      helpers.deleteUser(admin.id),
    ]);
  }, 30_000);

  // -------------------------------------------------------------------------
  // SELECT
  // -------------------------------------------------------------------------

  describe('SELECT', () => {
    it('alice (stagiaire cohorte A) ne peut pas voir la cohorte B (test négatif)', async () => {
      const { data, error } = await fixture.alice.client
        .from('cohortes')
        .select('*')
        .eq('id', fixture.bobCohorteId);

      expect(error).toBeNull();
      // RLS filtre silencieusement
      expect(data).toHaveLength(0);
    });

    it('alice peut voir sa propre cohorte (test positif)', async () => {
      const { data, error } = await fixture.alice.client
        .from('cohortes')
        .select('*')
        .eq('id', fixture.aliceCohorteId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect((data ?? [])[0]?.id).toBe(fixture.aliceCohorteId);
    });

    it('le formateur de la cohorte A peut voir la cohorte A', async () => {
      const { data, error } = await aliceFormateur.client
        .from('cohortes')
        .select('*')
        .eq('id', fixture.aliceCohorteId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('le formateur de la cohorte A ne peut pas voir la cohorte B (test négatif)', async () => {
      const { data, error } = await aliceFormateur.client
        .from('cohortes')
        .select('*')
        .eq('id', fixture.bobCohorteId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('un admin peut voir toutes les cohortes', async () => {
      const { data, error } = await admin.client
        .from('cohortes')
        .select('id')
        .in('id', [fixture.aliceCohorteId, fixture.bobCohorteId]);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // INSERT
  // -------------------------------------------------------------------------

  describe('INSERT', () => {
    it('un stagiaire ne peut pas créer une cohorte (test négatif)', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Récupérer un cursus_version_id valide
      const { data: aliceCohorte } = await helpers.adminClient
        .from('cohortes')
        .select('cursus_version_id')
        .eq('id', fixture.aliceCohorteId)
        .single();

      const { error } = await fixture.alice.client.from('cohortes').insert({
        cursus_version_id: aliceCohorte?.cursus_version_id ?? '',
        name: 'Cohorte créée par stagiaire',
        start_date: today,
        end_date: nextMonth,
        rhythm: 'WEEKLY',
        status: 'DRAFT',
      });

      // Policy INSERT inexistante pour STAGIAIRE
      expect(error).not.toBeNull();
    });

    it('un formateur principal ne peut pas créer une cohorte (test négatif)', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const { data: aliceCohorte } = await helpers.adminClient
        .from('cohortes')
        .select('cursus_version_id')
        .eq('id', fixture.aliceCohorteId)
        .single();

      const { error } = await aliceFormateur.client.from('cohortes').insert({
        cursus_version_id: aliceCohorte?.cursus_version_id ?? '',
        name: 'Cohorte créée par formateur',
        start_date: today,
        end_date: nextMonth,
        rhythm: 'WEEKLY',
        status: 'DRAFT',
      });

      expect(error).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------

  describe('UPDATE', () => {
    it('le formateur principal peut modifier le nom de sa cohorte', async () => {
      const newName = `Cohorte Renommée ${Date.now()}`;

      const { error } = await aliceFormateur.client
        .from('cohortes')
        .update({ name: newName })
        .eq('id', fixture.aliceCohorteId);

      expect(error).toBeNull();

      const { data } = await helpers.adminClient
        .from('cohortes')
        .select('name')
        .eq('id', fixture.aliceCohorteId)
        .single();
      expect(data?.name).toBe(newName);
    });

    it('un stagiaire ne peut pas modifier sa propre cohorte (test négatif)', async () => {
      const { data: originalData } = await helpers.adminClient
        .from('cohortes')
        .select('name')
        .eq('id', fixture.aliceCohorteId)
        .single();

      await fixture.alice.client
        .from('cohortes')
        .update({ name: 'Hacked cohorte name' })
        .eq('id', fixture.aliceCohorteId);

      const { data } = await helpers.adminClient
        .from('cohortes')
        .select('name')
        .eq('id', fixture.aliceCohorteId)
        .single();
      expect(data?.name).toBe(originalData?.name);
    });

    it('le formateur de A ne peut pas modifier la cohorte B (test négatif)', async () => {
      const { data: originalData } = await helpers.adminClient
        .from('cohortes')
        .select('name')
        .eq('id', fixture.bobCohorteId)
        .single();

      await aliceFormateur.client
        .from('cohortes')
        .update({ name: 'Cross-cohorte hack' })
        .eq('id', fixture.bobCohorteId);

      const { data } = await helpers.adminClient
        .from('cohortes')
        .select('name')
        .eq('id', fixture.bobCohorteId)
        .single();
      expect(data?.name).toBe(originalData?.name);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------------

  describe('DELETE', () => {
    it('un stagiaire ne peut pas supprimer une cohorte (test négatif)', async () => {
      const { error } = await fixture.alice.client
        .from('cohortes')
        .delete()
        .eq('id', fixture.aliceCohorteId);

      expect(error).not.toBeNull();

      // La cohorte existe toujours
      const { data } = await helpers.adminClient
        .from('cohortes')
        .select('id')
        .eq('id', fixture.aliceCohorteId)
        .single();
      expect(data?.id).toBe(fixture.aliceCohorteId);
    });

    it('un formateur principal ne peut pas supprimer une cohorte (test négatif)', async () => {
      const { error } = await aliceFormateur.client
        .from('cohortes')
        .delete()
        .eq('id', fixture.aliceCohorteId);

      expect(error).not.toBeNull();
    });
  });
});
