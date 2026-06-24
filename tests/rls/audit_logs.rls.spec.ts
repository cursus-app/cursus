/**
 * Tests RLS — table `audit_logs`
 *
 * Règle fondamentale : audit_logs est une table append-only immuable.
 *   - INSERT : réservé au service role (middleware Nitro), aucun utilisateur ne peut insérer.
 *   - SELECT : réservé à l'ADMIN uniquement.
 *   - UPDATE : personne, même l'ADMIN — immuabilité de l'audit trail.
 *   - DELETE : personne, même l'ADMIN — immuabilité de l'audit trail.
 *
 * Ces tests vérifient que PERSONNE (même un admin) ne peut modifier ou supprimer
 * un audit log existant.
 *
 * Pré-requis : SUPABASE_TEST_DB_URL doit être défini (sinon tous les tests sont skippés).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { helpers, type TwoTenantsFixture, type TestUser } from './helpers';

const SKIP_IF_NO_DB = !process.env['SUPABASE_TEST_DB_URL'];

describe.skipIf(SKIP_IF_NO_DB)('RLS: audit_logs', () => {
  let fixture: TwoTenantsFixture;
  let admin: TestUser;
  let seedLogId: string;

  beforeAll(async () => {
    fixture = await helpers.seedTwoTenants();
    admin = await helpers.createAdmin();

    // Créer un audit log de test via adminClient (service role)
    const { data, error } = await helpers.adminClient
      .from('audit_logs')
      .insert({
        actor_id: fixture.alice.id,
        action: 'TEST_ACTION',
        entity_type: 'users',
        entity_id: fixture.alice.id,
        diff: { test: true },
        metadata: { source: 'rls-test' },
      })
      .select('id')
      .single();

    if (error != null || data == null) {
      throw new Error(`Failed to seed audit log: ${error?.message ?? 'no data'}`);
    }
    seedLogId = data.id as string;
  }, 60_000);

  afterAll(async () => {
    // Cleanup du log de test (via service role en afterAll uniquement)
    if (seedLogId != null) {
      await helpers.adminClient.from('audit_logs').delete().eq('id', seedLogId);
    }
    await Promise.all([helpers.cleanTwoTenants(fixture), helpers.deleteUser(admin.id)]);
  }, 30_000);

  // -------------------------------------------------------------------------
  // SELECT
  // -------------------------------------------------------------------------

  describe('SELECT', () => {
    it('un stagiaire ne peut pas lire les audit_logs (test négatif)', async () => {
      const { data, error } = await fixture.alice.client
        .from('audit_logs')
        .select('*')
        .eq('id', seedLogId);

      expect(error).toBeNull();
      // RLS filtre silencieusement
      expect(data).toHaveLength(0);
    });

    it('un formateur ne peut pas lire les audit_logs (test négatif)', async () => {
      const formateur = await helpers.createFormateur(fixture.aliceCohorteId);

      const { data, error } = await formateur.client
        .from('audit_logs')
        .select('*')
        .eq('id', seedLogId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      await helpers.deleteUser(formateur.id);
    });

    it('un admin peut lire les audit_logs (test positif)', async () => {
      const { data, error } = await admin.client.from('audit_logs').select('*').eq('id', seedLogId);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect((data ?? [])[0]?.id).toBe(seedLogId);
    });
  });

  // -------------------------------------------------------------------------
  // INSERT
  // -------------------------------------------------------------------------

  describe('INSERT', () => {
    it('un stagiaire ne peut pas insérer un audit log (test négatif)', async () => {
      const { error } = await fixture.alice.client.from('audit_logs').insert({
        actor_id: fixture.alice.id,
        action: 'FAKE_ACTION',
        entity_type: 'users',
        entity_id: fixture.alice.id,
      });

      expect(error).not.toBeNull();
    });

    it('un admin ne peut pas insérer un audit log directement (append-only via service role)', async () => {
      const { error } = await admin.client.from('audit_logs').insert({
        actor_id: admin.id,
        action: 'ADMIN_DIRECT_INSERT',
        entity_type: 'users',
        entity_id: admin.id,
      });

      // La policy INSERT est réservée au service role uniquement
      expect(error).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // UPDATE — immuabilité
  // -------------------------------------------------------------------------

  describe('UPDATE — immuabilité de l audit trail', () => {
    it('un admin ne peut pas modifier un audit log existant (test négatif)', async () => {
      const { error } = await admin.client
        .from('audit_logs')
        .update({ action: 'MODIFIED_ACTION' })
        .eq('id', seedLogId);

      // Aucune policy UPDATE même pour l'admin
      expect(error).not.toBeNull();

      // Vérifier que la valeur n'a pas changé via adminClient
      const { data } = await helpers.adminClient
        .from('audit_logs')
        .select('action')
        .eq('id', seedLogId)
        .single();
      expect(data?.action).toBe('TEST_ACTION');
    });

    it('un stagiaire ne peut pas modifier un audit log (test négatif)', async () => {
      const { error } = await fixture.alice.client
        .from('audit_logs')
        .update({ action: 'HACKED' })
        .eq('id', seedLogId);

      expect(error).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // DELETE — immuabilité
  // -------------------------------------------------------------------------

  describe('DELETE — immuabilité de l audit trail', () => {
    it('un admin ne peut pas supprimer un audit log (test négatif)', async () => {
      const { error } = await admin.client.from('audit_logs').delete().eq('id', seedLogId);

      // Aucune policy DELETE même pour l'admin
      expect(error).not.toBeNull();

      // Le log existe toujours via adminClient
      const { data } = await helpers.adminClient
        .from('audit_logs')
        .select('id')
        .eq('id', seedLogId)
        .single();
      expect(data?.id).toBe(seedLogId);
    });

    it('un stagiaire ne peut pas supprimer un audit log (test négatif)', async () => {
      const { error } = await fixture.alice.client.from('audit_logs').delete().eq('id', seedLogId);

      expect(error).not.toBeNull();
    });
  });
});
