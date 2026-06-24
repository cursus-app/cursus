/**
 * Parcours E2E 3 — Soumission de livrable + validation harnais (ST-16.4)
 *
 * Flux : stagiaire soumet un dépôt GitHub → harnais GitHub Actions valide
 * → résultat "validated" → portfolio mis à jour.
 *
 * Dépend de :
 * - ST-02.1 : auth
 * - ST-05.x : soumissions livrables (non implémenté)
 * - Sprint 0 : harnais GitHub Actions (non implémenté)
 * - ST-07.x : portfolio (non implémenté)
 *
 * Skippé jusqu'à ce que PLAYWRIGHT_ENABLE_FULL_E2E soit activé.
 */
import { test, expect } from '@playwright/test';

test.describe('Soumission + harnais', () => {
  test.skip(
    !process.env['PLAYWRIGHT_ENABLE_FULL_E2E'],
    'Feature incomplète — nécessite harnais GitHub Actions (sprint 0) et EP-05 soumissions',
  );

  test.beforeAll(async () => {
    // Vérifier que le mock GitHub Actions est activé
    if (!process.env['PLAYWRIGHT_MOCK_GITHUB_ACTIONS']) {
      throw new Error('PLAYWRIGHT_MOCK_GITHUB_ACTIONS doit être défini pour ce parcours E2E');
    }
  });

  test('stagiaire soumet un repo → harnais valide → portfolio MAJ', async ({ page }) => {
    // Prérequis : stagiaire authentifié en semaine 2
    // Les valeurs sont garanties non-vides par le gate PLAYWRIGHT_ENABLE_FULL_E2E
    const email = process.env['PLAYWRIGHT_STAGIAIRE_EMAIL'] ?? '';
    const password = process.env['PLAYWRIGHT_STAGIAIRE_PASSWORD'] ?? '';

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL(/\/(dashboard|profil|cohortes|$)/);

    // Étape 1 : Naviguer vers la semaine 2
    await page.goto('/mon-cursus/semaine-2');
    await expect(page.getByText(/livrable semaine 2/i)).toBeVisible();

    // Étape 2 : Soumettre un dépôt (fixture-pass = dépôt qui passe les tests)
    await page.getByRole('button', { name: /soumettre mon livrable/i }).click();
    await page.getByLabel(/url du dépôt github/i).fill('https://github.com/test/fixture-pass');
    await page.getByRole('button', { name: /valider la soumission/i }).click();

    // Étape 3 : Attendre le résultat du harnais (mocké — pas de vraie GH Action)
    // Le mock répond dans les 5 secondes via Inngest
    await expect(page.getByText(/validé/i)).toBeVisible({ timeout: 30_000 });

    // Étape 4 : Vérifier la MAJ du portfolio
    await page.goto('/portfolio');
    await expect(page.getByText(/semaine 2.*validé/i)).toBeVisible();
  });

  test('harnais échoue → stagiaire voit les erreurs détaillées', async ({ page }) => {
    const email = process.env['PLAYWRIGHT_STAGIAIRE_EMAIL'] ?? '';
    const password = process.env['PLAYWRIGHT_STAGIAIRE_PASSWORD'] ?? '';

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL(/\/(dashboard|profil|cohortes|$)/);

    // fixture-fail = dépôt avec des tests qui échouent
    await page.goto('/mon-cursus/semaine-2');
    await page.getByRole('button', { name: /soumettre mon livrable/i }).click();
    await page.getByLabel(/url du dépôt github/i).fill('https://github.com/test/fixture-fail');
    await page.getByRole('button', { name: /valider la soumission/i }).click();

    await expect(page.getByText(/échoué|non validé/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('region', { name: /détails d'erreur/i })).toBeVisible();
  });
});
