/**
 * Tests RLS — table `submissions`
 *
 * Scénarios couverts :
 *   - SELECT : isolation inter-cohortes (test négatif), propre données (test positif),
 *              formateur de la même cohorte peut voir, formateur cross-cohorte ne peut pas.
 *   - INSERT : stagiaire peut soumettre en son nom, ne peut pas usurper l'identité d'un autre.
 *   - UPDATE : seul un formateur de la cohorte peut modifier (override), pas un autre stagiaire.
 *   - DELETE : aucun utilisateur ne peut supprimer une submission.
 *
 * Pré-requis : SUPABASE_TEST_DB_URL doit être défini (sinon tous les tests sont skippés).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { helpers, type TwoTenantsFixture, type TestUser } from './helpers';

const SKIP_IF_NO_DB = !process.env['SUPABASE_TEST_DB_URL'];

describe.skipIf(SKIP_IF_NO_DB)('RLS: submissions', () => {
  let fixture: TwoTenantsFixture;
  let aliceModuleId: string;
  let bobModuleId: string;
  let aliceFormateur: TestUser;
  let externalFormateur: TestUser;

  beforeAll(async () => {
    fixture = await helpers.seedTwoTenants();

    // Récupérer un module dans chaque cohorte via la table cohortes → cursus_version → cursus → modules
    // Pour simplifier, on crée directement un module dans le cursus de chaque cohorte.
    const { data: aliceCohorte } = await helpers.adminClient
      .from('cohortes')
      .select('cursus_version_id, cursus_versions(cursus_id)')
      .eq('id', fixture.aliceCohorteId)
      .single();

    const { data: bobCohorte } = await helpers.adminClient
      .from('cohortes')
      .select('cursus_version_id, cursus_versions(cursus_id)')
      .eq('id', fixture.bobCohorteId)
      .single();

    // Typage intermédiaire pour accéder aux jointures imbriquées
    type CohorteWithVersion = {
      cursus_version_id: string;
      cursus_versions: { cursus_id: string } | null;
    };

    const aliceCohorteTyped = aliceCohorte as CohorteWithVersion | null;
    const bobCohorteTyped = bobCohorte as CohorteWithVersion | null;

    const aliceCursusId = aliceCohorteTyped?.cursus_versions?.cursus_id;
    const bobCursusId = bobCohorteTyped?.cursus_versions?.cursus_id;

    if (aliceCursusId == null || bobCursusId == null) {
      throw new Error('Could not retrieve cursus IDs for test cohortes');
    }

    aliceModuleId = await helpers.createTestModule(aliceCursusId, 1);
    bobModuleId = await helpers.createTestModule(bobCursusId, 1);

    // Formateur dans la cohorte d'Alice
    aliceFormateur = await helpers.createFormateur(fixture.aliceCohorteId);
    // Formateur dans une 3e cohorte (externe à alice ET bob)
    const externalCohorteId = await helpers.createTestCohorte(`C-external`);
    externalFormateur = await helpers.createFormateur(externalCohorteId);
  }, 60_000);

  afterAll(async () => {
    await Promise.all([
      helpers.cleanTwoTenants(fixture),
      aliceFormateur != null ? helpers.deleteUser(aliceFormateur.id) : Promise.resolve(),
      externalFormateur != null ? helpers.deleteUser(externalFormateur.id) : Promise.resolve(),
    ]);
  }, 30_000);

  // -------------------------------------------------------------------------
  // SELECT
  // -------------------------------------------------------------------------

  describe('SELECT', () => {
    it('AC Scénario 1 — alice ne peut pas voir les submissions de bob (test négatif)', async () => {
      // Bob crée une submission (via adminClient pour le setup)
      const bobSubmission = await helpers.createSubmission(fixture.bob.id, bobModuleId);

      // Alice tente de lire la submission de bob avec son client (RLS active)
      const { data, error } = await fixture.alice.client
        .from('submissions')
        .select('*')
        .eq('id', bobSubmission.id);

      expect(error).toBeNull();
      // RLS filtre silencieusement — 0 rows retournées, pas d'erreur explicite
      expect(data).toHaveLength(0);
    });

    it('AC Scénario 2 — alice voit exactement ses propres submissions (test positif)', async () => {
      // Créer 3 submissions pour alice
      const s1 = await helpers.createSubmission(fixture.alice.id, aliceModuleId);
      const s2 = await helpers.createSubmission(fixture.alice.id, aliceModuleId);
      const s3 = await helpers.createSubmission(fixture.alice.id, aliceModuleId);
      const aliceIds = new Set([s1.id, s2.id, s3.id]);

      const { data, error } = await fixture.alice.client
        .from('submissions')
        .select('*')
        .in('id', [s1.id, s2.id, s3.id]);

      expect(error).toBeNull();
      expect(data).toHaveLength(3);
      // Vérifier que toutes les submissions retournées appartiennent à alice
      for (const row of data ?? []) {
        expect(aliceIds.has(row.id as string)).toBe(true);
        expect(row.user_id).toBe(fixture.alice.id);
      }
    });

    it('un formateur de la cohorte d alice peut voir ses submissions', async () => {
      const aliceSubmission = await helpers.createSubmission(fixture.alice.id, aliceModuleId);

      const { data, error } = await aliceFormateur.client
        .from('submissions')
        .select('*')
        .eq('id', aliceSubmission.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect((data ?? [])[0]?.id).toBe(aliceSubmission.id);
    });

    it('un formateur externe ne peut pas voir les submissions d alice (test négatif)', async () => {
      const aliceSubmission = await helpers.createSubmission(fixture.alice.id, aliceModuleId);

      const { data, error } = await externalFormateur.client
        .from('submissions')
        .select('*')
        .eq('id', aliceSubmission.id);

      expect(error).toBeNull();
      // RLS filtre silencieusement
      expect(data).toHaveLength(0);
    });

    it('AC Scénario 3 — formateur cross-cohorte ne voit pas les submissions de la cohorte B', async () => {
      // aliceFormateur est dans la cohorte A seulement
      const bobSubmission = await helpers.createSubmission(fixture.bob.id, bobModuleId);

      const { data, error } = await aliceFormateur.client
        .from('submissions')
        .select('*')
        .eq('id', bobSubmission.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // INSERT
  // -------------------------------------------------------------------------

  describe('INSERT', () => {
    it('alice peut créer une submission en son propre nom', async () => {
      const { data, error } = await fixture.alice.client
        .from('submissions')
        .insert({
          user_id: fixture.alice.id,
          module_id: aliceModuleId,
          repo_url: 'https://github.com/alice/projet',
          status: 'PENDING',
          attempt_number: 1,
        })
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect((data ?? [])[0]?.user_id).toBe(fixture.alice.id);
    });

    it('alice ne peut pas créer une submission au nom de bob (usurpation — test négatif)', async () => {
      const { data, error } = await fixture.alice.client
        .from('submissions')
        .insert({
          user_id: fixture.bob.id, // <- usurpation
          module_id: aliceModuleId,
          repo_url: 'https://github.com/alice/hijack',
          status: 'PENDING',
          attempt_number: 1,
        })
        .select();

      // RLS doit rejeter : user_id != auth.uid()
      expect(error).not.toBeNull();
      // Aucun row inséré
      expect(data).toBeNull();
    });

    it('un formateur ne peut pas créer de submission (pas son rôle)', async () => {
      const { data, error } = await aliceFormateur.client
        .from('submissions')
        .insert({
          user_id: aliceFormateur.id,
          module_id: aliceModuleId,
          repo_url: 'https://github.com/formateur/tentative',
          status: 'PENDING',
          attempt_number: 1,
        })
        .select();

      // Les formateurs n'ont pas de policy INSERT
      expect(error).not.toBeNull();
      expect(data).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------

  describe('UPDATE', () => {
    it('AC Scénario 3 — alice ne peut pas modifier une submission de bob (test négatif)', async () => {
      const bobSubmission = await helpers.createSubmission(fixture.bob.id, bobModuleId);
      const originalUrl = bobSubmission.repo_url;

      await fixture.alice.client
        .from('submissions')
        .update({ repo_url: 'https://github.com/hacked/repo' })
        .eq('id', bobSubmission.id);

      // Vérifier via adminClient que la valeur n'a pas changé (RLS filtre silencieusement)
      const { data } = await helpers.adminClient
        .from('submissions')
        .select('repo_url')
        .eq('id', bobSubmission.id)
        .single();

      expect(data?.repo_url).toBe(originalUrl);
    });

    it('un formateur de la cohorte peut override (UPDATE) une submission de sa cohorte', async () => {
      const aliceSubmission = await helpers.createSubmission(fixture.alice.id, aliceModuleId);

      const { error } = await aliceFormateur.client
        .from('submissions')
        .update({ status: 'VALIDATED_OVERRIDE', override_reason: 'Test override' })
        .eq('id', aliceSubmission.id);

      expect(error).toBeNull();

      // Vérifier la mise à jour
      const { data } = await helpers.adminClient
        .from('submissions')
        .select('status')
        .eq('id', aliceSubmission.id)
        .single();
      expect(data?.status).toBe('VALIDATED_OVERRIDE');
    });

    it('alice ne peut pas modifier sa propre submission une fois soumise (immutabilité)', async () => {
      const aliceSubmission = await helpers.createSubmission(fixture.alice.id, aliceModuleId);

      const { error } = await fixture.alice.client
        .from('submissions')
        .update({ repo_url: 'https://github.com/alice/modified' })
        .eq('id', aliceSubmission.id);

      // La policy RLS n'autorise pas UPDATE par les stagiaires
      expect(error).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // DELETE
  // -------------------------------------------------------------------------

  describe('DELETE', () => {
    it('alice ne peut pas supprimer sa propre submission', async () => {
      const aliceSubmission = await helpers.createSubmission(fixture.alice.id, aliceModuleId);

      const { error } = await fixture.alice.client
        .from('submissions')
        .delete()
        .eq('id', aliceSubmission.id);

      // Aucune policy DELETE pour les stagiaires
      expect(error).not.toBeNull();

      // La submission existe toujours
      const { data } = await helpers.adminClient
        .from('submissions')
        .select('id')
        .eq('id', aliceSubmission.id)
        .single();
      expect(data?.id).toBe(aliceSubmission.id);
    });

    it('un formateur ne peut pas supprimer une submission', async () => {
      const aliceSubmission = await helpers.createSubmission(fixture.alice.id, aliceModuleId);

      const { error } = await aliceFormateur.client
        .from('submissions')
        .delete()
        .eq('id', aliceSubmission.id);

      expect(error).not.toBeNull();
    });
  });
});
