/**
 * Parcours E2E 6 — Capstone complet (ST-16.4)
 *
 * Flux : stagiaire soumet son capstone → formateur planifie la soutenance
 * → évaluation → certificat généré → profil public accessible.
 *
 * Dépend de :
 * - ST-02.1 : auth
 * - EP-08 : capstone (non implémenté)
 * - EP-09 : certificats numériques (non implémenté)
 * - EP-10 : portfolio public (non implémenté)
 *
 * Skippé jusqu'à ce que PLAYWRIGHT_ENABLE_FULL_E2E soit activé.
 */
import { test, expect } from '@playwright/test';

test.describe('Capstone complet', () => {
  test.skip(
    !process.env['PLAYWRIGHT_ENABLE_FULL_E2E'],
    'Feature incomplète — nécessite EP-08 (capstone) et EP-09 (certificats)',
  );

  test('soumission capstone → soutenance → évaluation → certificat émis', async ({ browser }) => {
    const stagiaireCtx = await browser.newContext();
    const formateurCtx = await browser.newContext();

    const stagiairePage = await stagiaireCtx.newPage();
    const formateurPage = await formateurCtx.newPage();

    // Les valeurs sont garanties non-vides par le gate PLAYWRIGHT_ENABLE_FULL_E2E
    const stagiaireEmail = process.env['PLAYWRIGHT_STAGIAIRE_EMAIL'] ?? '';
    const stagiairePwd = process.env['PLAYWRIGHT_STAGIAIRE_PASSWORD'] ?? '';
    const formateurEmail = process.env['PLAYWRIGHT_FORMATEUR_EMAIL'] ?? '';
    const formateurPwd = process.env['PLAYWRIGHT_FORMATEUR_PASSWORD'] ?? '';

    try {
      // Authentification stagiaire
      await stagiairePage.goto('/login');
      await stagiairePage.getByLabel('Email').fill(stagiaireEmail);
      await stagiairePage.getByLabel('Mot de passe').fill(stagiairePwd);
      await stagiairePage.getByRole('button', { name: /se connecter/i }).click();
      await stagiairePage.waitForURL(/\/(dashboard|profil|cohortes|$)/);

      // Authentification formateur
      await formateurPage.goto('/login');
      await formateurPage.getByLabel('Email').fill(formateurEmail);
      await formateurPage.getByLabel('Mot de passe').fill(formateurPwd);
      await formateurPage.getByRole('button', { name: /se connecter/i }).click();
      await formateurPage.waitForURL(/\/(dashboard|profil|cohortes|$)/);

      // Étape 1 : Stagiaire soumet son capstone
      await stagiairePage.goto('/mon-cursus/capstone');
      await stagiairePage
        .getByLabel(/url du projet capstone/i)
        .fill('https://github.com/test/capstone-e2e');
      await stagiairePage
        .getByLabel(/description/i)
        .fill('Application fullstack de gestion de recettes de cuisine.');
      await stagiairePage.getByRole('button', { name: /soumettre le capstone/i }).click();

      await expect(stagiairePage.getByText(/capstone soumis/i)).toBeVisible({ timeout: 10_000 });

      // Étape 2 : Formateur planifie la soutenance
      await formateurPage.goto('/dashboard/soutenances');
      await expect(formateurPage.getByText(/capstone en attente/i)).toBeVisible({
        timeout: 10_000,
      });

      await formateurPage
        .getByRole('button', { name: /planifier la soutenance/i })
        .first()
        .click();
      await formateurPage.getByLabel(/date de soutenance/i).fill('2026-08-01');
      await formateurPage.getByRole('button', { name: /confirmer/i }).click();

      // Étape 3 : Évaluation (note + commentaires)
      await formateurPage.goto('/dashboard/soutenances');
      await formateurPage
        .getByRole('button', { name: /évaluer/i })
        .first()
        .click();

      await formateurPage.getByLabel(/note globale/i).fill('16');
      await formateurPage
        .getByLabel(/commentaires/i)
        .fill('Excellent projet fullstack, très bien structuré et documenté.');
      await formateurPage.getByRole('button', { name: /valider l'évaluation/i }).click();

      await expect(formateurPage.getByText(/évaluation enregistrée/i)).toBeVisible({
        timeout: 10_000,
      });

      // Étape 4 : Certificat généré automatiquement (Inngest)
      await expect(stagiairePage.getByText(/votre certificat est disponible/i)).toBeVisible({
        timeout: 60_000,
      });

      // Vérifier le téléchargement du certificat PDF
      const downloadPromise = stagiairePage.waitForEvent('download');
      await stagiairePage.getByRole('link', { name: /télécharger le certificat/i }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/certificat.*cursus.*\.pdf$/i);

      // Étape 5 : Profil public accessible
      await stagiairePage.goto('/portfolio');
      const profileUrl = await stagiairePage
        .getByRole('link', { name: /voir mon profil public/i })
        .getAttribute('href');

      expect(profileUrl).toBeTruthy();
      await stagiairePage.goto(profileUrl ?? '/');
      await expect(stagiairePage.getByText(/certifié par cursus/i)).toBeVisible();
    } finally {
      await stagiaireCtx.close();
      await formateurCtx.close();
    }
  });
});
