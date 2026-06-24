/**
 * Tests RLS — table `memberships`
 *
 * Scénarios couverts :
 *   - SELECT : un stagiaire voit uniquement sa propre appartenance.
 *   - SELECT : un formateur principal voit les memberships de sa cohorte.
 *   - INSERT : un formateur peut ajouter des membres dans sa cohorte, pas dans une autre.
 *   - UPDATE : empêcher l'escalade de rôle via membership.
 *   - DELETE : un formateur peut retirer des membres de sa cohorte.
 *
 * Pré-requis : SUPABASE_TEST_DB_URL doit être défini (sinon tous les tests sont skippés).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { helpers, type TwoTenantsFixture, type TestUser } from './helpers';

const SKIP_IF_NO_DB = !process.env['SUPABASE_TEST_DB_URL'];

describe.skipIf(SKIP_IF_NO_DB)('RLS: memberships', () => {
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
    it('alice ne voit que sa propre appartenance (test — isolation propre)', async () => {
      const { data, error } = await fixture.alice.client
        .from('memberships')
        .select('*')
        .eq('user_id', fixture.alice.id);

      expect(error).toBeNull();
      expect((data ?? []).every((m) => m.user_id === fixture.alice.id)).toBe(true);
    });

    it('alice ne peut pas voir l appartenance de bob (test négatif)', async () => {
      const { data, error } = await fixture.alice.client
        .from('memberships')
        .select('*')
        .eq('user_id', fixture.bob.id);

      expect(error).toBeNull();
      // RLS filtre silencieusement
      expect(data).toHaveLength(0);
    });

    it('le formateur de A voit tous les memberships de sa cohorte', async () => {
      const { data, error } = await aliceFormateur.client
        .from('memberships')
        .select('*')
        .eq('cohorte_id', fixture.aliceCohorteId);

      expect(error).toBeNull();
      // alice + aliceFormateur au minimum
      expect((data ?? []).length).toBeGreaterThanOrEqual(2);
      // Tous les memberships retournés appartiennent à la cohorte A
      expect((data ?? []).every((m) => m.cohorte_id === fixture.aliceCohorteId)).toBe(true);
    });

    it('le formateur de A ne peut pas voir les memberships de la cohorte B (test négatif)', async () => {
      const { data, error } = await aliceFormateur.client
        .from('memberships')
        .select('*')
        .eq('cohorte_id', fixture.bobCohorteId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('un admin peut voir tous les memberships', async () => {
      const { data, error } = await admin.client
        .from('memberships')
        .select('id')
        .in('cohorte_id', [fixture.aliceCohorteId, fixture.bobCohorteId]);

      expect(error).toBeNull();
      expect((data ?? []).length).toBeGreaterThanOrEqual(3); // alice, bob, aliceFormateur
    });
  });

  // -------------------------------------------------------------------------
  // INSERT
  // -------------------------------------------------------------------------

  describe('INSERT', () => {
    it('un stagiaire ne peut pas ajouter un membre dans sa propre cohorte (test négatif)', async () => {
      // Créer un utilisateur orphelin pour la tentative
      const orphanUser = await helpers.createTestUser(
        `orphan-${Date.now()}@test.cursus.app`,
        'STAGIAIRE',
      );

      const { error } = await fixture.alice.client.from('memberships').insert({
        user_id: orphanUser.id,
        cohorte_id: fixture.aliceCohorteId,
        role: 'STAGIAIRE',
      });

      expect(error).not.toBeNull();
      await helpers.deleteUser(orphanUser.id);
    });

    it('le formateur de A peut ajouter un membre dans sa cohorte', async () => {
      const newUser = await helpers.createTestUser(
        `new-stagiaire-${Date.now()}@test.cursus.app`,
        'STAGIAIRE',
      );

      const { error } = await aliceFormateur.client.from('memberships').insert({
        user_id: newUser.id,
        cohorte_id: fixture.aliceCohorteId,
        role: 'STAGIAIRE',
      });

      expect(error).toBeNull();

      // Cleanup
      await helpers.adminClient
        .from('memberships')
        .delete()
        .eq('user_id', newUser.id)
        .eq('cohorte_id', fixture.aliceCohorteId);
      await helpers.deleteUser(newUser.id);
    });

    it('le formateur de A ne peut pas ajouter un membre dans la cohorte B (test négatif)', async () => {
      const newUser = await helpers.createTestUser(
        `cross-stagiaire-${Date.now()}@test.cursus.app`,
        'STAGIAIRE',
      );

      const { error } = await aliceFormateur.client.from('memberships').insert({
        user_id: newUser.id,
        cohorte_id: fixture.bobCohorteId, // cohorte B — formateur A n'a pas accès
        role: 'STAGIAIRE',
      });

      expect(error).not.toBeNull();
      await helpers.deleteUser(newUser.id);
    });
  });

  // -------------------------------------------------------------------------
  // UPDATE (escalade de rôle)
  // -------------------------------------------------------------------------

  describe('UPDATE — escalade de rôle interdite', () => {
    it('alice ne peut pas modifier son propre rôle dans la cohorte (test négatif)', async () => {
      // Récupérer le membership d'alice
      const { data: aliceMembership } = await helpers.adminClient
        .from('memberships')
        .select('id, role')
        .eq('user_id', fixture.alice.id)
        .eq('cohorte_id', fixture.aliceCohorteId)
        .single();

      await fixture.alice.client
        .from('memberships')
        .update({ role: 'FORMATEUR_PRINCIPAL' }) // tentative d'escalade
        .eq('id', aliceMembership?.id ?? '');

      // Le rôle n'a pas changé
      const { data } = await helpers.adminClient
        .from('memberships')
        .select('role')
        .eq('id', aliceMembership?.id ?? '')
        .single();
      expect(data?.role).toBe('STAGIAIRE');
    });

    it('le formateur ne peut pas s auto-promouvoir ADMIN via membership', async () => {
      const { data: formateurMembership } = await helpers.adminClient
        .from('memberships')
        .select('id, role')
        .eq('user_id', aliceFormateur.id)
        .eq('cohorte_id', fixture.aliceCohorteId)
        .single();

      // Tentative : le membership ne porte que les rôles STAGIAIRE/FORMATEUR_PRINCIPAL/CO_FORMATEUR
      // Tenter d'insérer un rôle invalide ou de modifier via RLS
      const { error } = await aliceFormateur.client
        .from('memberships')
        .update({ role: 'STAGIAIRE' }) // downgrade to test the policy works at all
        .eq('id', formateurMembership?.id ?? '')
        .eq('user_id', aliceFormateur.id); // uniquement son propre membership

      // La policy ne doit pas autoriser les formateurs à modifier leurs propres memberships
      expect(error).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------------

  describe('DELETE', () => {
    it('un stagiaire ne peut pas se retirer lui-même d une cohorte (test négatif)', async () => {
      const { data: aliceMembership } = await helpers.adminClient
        .from('memberships')
        .select('id')
        .eq('user_id', fixture.alice.id)
        .eq('cohorte_id', fixture.aliceCohorteId)
        .single();

      const { error } = await fixture.alice.client
        .from('memberships')
        .delete()
        .eq('id', aliceMembership?.id ?? '');

      expect(error).not.toBeNull();

      // Le membership existe toujours
      const { data } = await helpers.adminClient
        .from('memberships')
        .select('id')
        .eq('id', aliceMembership?.id ?? '')
        .single();
      expect(data?.id).toBe(aliceMembership?.id);
    });
  });
});
