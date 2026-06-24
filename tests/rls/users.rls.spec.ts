/**
 * Tests RLS — table `users`
 *
 * Scénarios couverts :
 *   - SELECT : un user ne peut pas lire les données d'un autre (sauf profils publics).
 *   - UPDATE : un user ne peut modifier que son propre profil.
 *   - Escalade de rôle interdite : un stagiaire ne peut pas modifier son `global_role`.
 *   - Anonymous : ne voit que les profils avec `is_public = true`.
 *
 * Pré-requis : SUPABASE_TEST_DB_URL doit être défini (sinon tous les tests sont skippés).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { helpers, type TwoTenantsFixture, type TestUser } from './helpers';
import { createClient } from '@supabase/supabase-js';

const SKIP_IF_NO_DB = !process.env['SUPABASE_TEST_DB_URL'];

describe.skipIf(SKIP_IF_NO_DB)('RLS: users', () => {
  let fixture: TwoTenantsFixture;
  let admin: TestUser;

  beforeAll(async () => {
    fixture = await helpers.seedTwoTenants();
    admin = await helpers.createAdmin();
  }, 60_000);

  afterAll(async () => {
    await Promise.all([helpers.cleanTwoTenants(fixture), helpers.deleteUser(admin.id)]);
  }, 30_000);

  // -------------------------------------------------------------------------
  // SELECT
  // -------------------------------------------------------------------------

  describe('SELECT', () => {
    it('alice ne peut pas lire le profil complet de bob (test négatif)', async () => {
      const { data, error } = await fixture.alice.client
        .from('users')
        .select('*')
        .eq('id', fixture.bob.id);

      expect(error).toBeNull();
      // RLS filtre silencieusement — bob n'est pas dans la même cohorte qu'alice
      expect(data).toHaveLength(0);
    });

    it('alice peut lire son propre profil (test positif)', async () => {
      const { data, error } = await fixture.alice.client
        .from('users')
        .select('*')
        .eq('id', fixture.alice.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect((data ?? [])[0]?.id).toBe(fixture.alice.id);
    });

    it('un admin peut lire tous les profils', async () => {
      const { data, error } = await admin.client
        .from('users')
        .select('id')
        .in('id', [fixture.alice.id, fixture.bob.id]);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it('un anonymous ne peut pas lire les profils privés (is_public = false)', async () => {
      // Client Supabase sans token (anonymous)
      const anonClient = createClient(
        process.env['SUPABASE_URL'] ?? '',
        process.env['SUPABASE_ANON_KEY'] ?? '',
        { auth: { persistSession: false } },
      );

      const { data, error } = await anonClient
        .from('users')
        .select('id, email')
        .eq('id', fixture.alice.id);

      expect(error).toBeNull();
      // alice.is_public = false par défaut → 0 rows
      expect(data).toHaveLength(0);
    });

    it('un anonymous peut lire un profil public (is_public = true)', async () => {
      // Rendre alice publique via adminClient
      await helpers.adminClient
        .from('users')
        .update({ is_public: true, public_slug: `alice-${Date.now()}` })
        .eq('id', fixture.alice.id);

      const anonClient = createClient(
        process.env['SUPABASE_URL'] ?? '',
        process.env['SUPABASE_ANON_KEY'] ?? '',
        { auth: { persistSession: false } },
      );

      const { data, error } = await anonClient
        .from('users')
        .select('id, full_name')
        .eq('id', fixture.alice.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);

      // Remettre alice en profil privé
      await helpers.adminClient
        .from('users')
        .update({ is_public: false })
        .eq('id', fixture.alice.id);
    });
  });

  // -------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------

  describe('UPDATE', () => {
    it('alice peut modifier son propre profil (bio, fullName)', async () => {
      const { error } = await fixture.alice.client
        .from('users')
        .update({ bio: 'Ma nouvelle bio de test', full_name: 'Alice Updated' })
        .eq('id', fixture.alice.id);

      expect(error).toBeNull();

      // Vérifier que la modification a été appliquée
      const { data } = await helpers.adminClient
        .from('users')
        .select('bio')
        .eq('id', fixture.alice.id)
        .single();
      expect(data?.bio).toBe('Ma nouvelle bio de test');
    });

    it('alice ne peut pas modifier le profil de bob (test négatif)', async () => {
      const { data: originalData } = await helpers.adminClient
        .from('users')
        .select('bio')
        .eq('id', fixture.bob.id)
        .single();

      await fixture.alice.client
        .from('users')
        .update({ bio: 'Hacked bio' })
        .eq('id', fixture.bob.id);

      // La bio de bob n'a pas changé
      const { data } = await helpers.adminClient
        .from('users')
        .select('bio')
        .eq('id', fixture.bob.id)
        .single();
      expect(data?.bio).toBe(originalData?.bio);
    });

    it('un stagiaire ne peut pas escalader son propre global_role (test négatif)', async () => {
      const { data: originalData } = await helpers.adminClient
        .from('users')
        .select('global_role')
        .eq('id', fixture.alice.id)
        .single();

      const { error } = await fixture.alice.client
        .from('users')
        .update({ global_role: 'ADMIN' }) // tentative d'escalade
        .eq('id', fixture.alice.id);

      // La policy CHECK sur global_role doit rejeter
      expect(error).not.toBeNull();

      // Le rôle n'a pas changé
      const { data } = await helpers.adminClient
        .from('users')
        .select('global_role')
        .eq('id', fixture.alice.id)
        .single();
      expect(data?.global_role).toBe(originalData?.global_role);
    });

    it('un admin peut modifier le global_role d un utilisateur', async () => {
      // Passer alice en CO_FORMATEUR temporairement
      const { error } = await admin.client
        .from('users')
        .update({ global_role: 'CO_FORMATEUR' })
        .eq('id', fixture.alice.id);

      expect(error).toBeNull();

      // Rétablir le rôle original
      await helpers.adminClient
        .from('users')
        .update({ global_role: 'STAGIAIRE' })
        .eq('id', fixture.alice.id);
    });
  });

  // -------------------------------------------------------------------------
  // INSERT / DELETE
  // -------------------------------------------------------------------------

  describe('INSERT et DELETE', () => {
    it('un stagiaire ne peut pas créer un nouveau profil utilisateur', async () => {
      const { error } = await fixture.alice.client.from('users').insert({
        id: '00000000-0000-0000-0000-000000000099',
        email: 'fake@test.cursus.app',
        global_role: 'STAGIAIRE',
      });

      expect(error).not.toBeNull();
    });

    it('un stagiaire ne peut pas supprimer un profil (même le sien)', async () => {
      const { error } = await fixture.alice.client
        .from('users')
        .delete()
        .eq('id', fixture.alice.id);

      // Aucune policy DELETE pour les utilisateurs
      expect(error).not.toBeNull();
    });
  });
});
