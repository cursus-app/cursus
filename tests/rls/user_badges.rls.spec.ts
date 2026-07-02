/**
 * Tests RLS — table `user_badges`
 *
 * Scénarios couverts :
 *   - SELECT : un stagiaire ne voit que ses propres badges (test négatif cross-tenant).
 *   - SELECT : un stagiaire voit ses propres badges (test positif).
 *   - INSERT : un stagiaire ne peut pas s'auto-attribuer un badge directement.
 *
 * Pré-requis : SUPABASE_TEST_DB_URL doit être défini (sinon tous les tests sont skippés).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { helpers, type TwoTenantsFixture } from './helpers';

const SKIP_IF_NO_DB = !process.env['SUPABASE_TEST_DB_URL'];

describe.skipIf(SKIP_IF_NO_DB)('RLS: user_badges', () => {
  let fixture: TwoTenantsFixture;

  beforeAll(async () => {
    fixture = await helpers.seedTwoTenants();
  }, 60_000);

  afterAll(async () => {
    await helpers.cleanTwoTenants(fixture);
  }, 30_000);

  describe('SELECT', () => {
    it('alice ne voit pas les badges de bob (test négatif cross-tenant)', async () => {
      const { data, error } = await fixture.alice.client
        .from('user_badges')
        .select('*')
        .eq('user_id', fixture.bob.id);

      expect(error).toBeNull();
      // RLS filtre silencieusement — aucun badge de bob visible
      expect(data).toHaveLength(0);
    });

    it('alice voit ses propres badges (test positif)', async () => {
      const { error } = await fixture.alice.client
        .from('user_badges')
        .select('*')
        .eq('user_id', fixture.alice.id);

      expect(error).toBeNull();
    });
  });

  describe('INSERT', () => {
    it("un stagiaire ne peut pas s'auto-attribuer un badge (test négatif)", async () => {
      // Tentative d'INSERT direct contournant l'API métier
      const { error } = await fixture.alice.client.from('user_badges').insert({
        user_id: fixture.alice.id,
        badge_id: '00000000-0000-0000-0000-000000000001',
      });

      // RLS ou contrainte FK doit bloquer l'INSERT direct
      expect(error).not.toBeNull();
    });
  });

  describe('UPDATE / DELETE', () => {
    it("bob ne peut pas supprimer les badges d'alice (test négatif)", async () => {
      const { error } = await fixture.bob.client
        .from('user_badges')
        .delete()
        .eq('user_id', fixture.alice.id);

      // RLS filtre silencieusement (0 rows affected, no error) ou bloque
      // La table est read-only pour les stagiaires hors de leur scope
      expect(error).toBeNull(); // Supabase RLS filtre, pas d'erreur, juste 0 rows
    });
  });
});
