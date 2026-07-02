/**
 * Parcours E2E 7 — Quiz builder (ST-07.1)
 *
 * Flux : formateur crée un quiz de 7 questions dans le module editor →
 * vérification de la preview → validation des contraintes (pas de bonne réponse = erreur).
 *
 * Skippé jusqu'à ce que PLAYWRIGHT_ENABLE_FULL_E2E soit activé.
 */
import { test, expect } from '@playwright/test';

test.describe('Quiz builder — création et preview', () => {
  test.skip(
    !process.env['PLAYWRIGHT_ENABLE_FULL_E2E'],
    'Feature incomplète — nécessite EP-03 (cursus) et EP-07 (quiz)',
  );

  test('formateur crée un quiz de 7 questions QCM avec bonne réponse', async ({ page }) => {
    const email = process.env['PLAYWRIGHT_FORMATEUR_EMAIL'] ?? '';
    const password = process.env['PLAYWRIGHT_FORMATEUR_PASSWORD'] ?? '';
    const cursusId = process.env['PLAYWRIGHT_CURSUS_ID'] ?? '';
    const moduleId = process.env['PLAYWRIGHT_MODULE_ID'] ?? '';

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL(/\/(dashboard|profil|cohortes|$)/);

    await page.goto(`/cursus/${cursusId}/modules/${moduleId}/edit`);
    await page.waitForSelector('[data-testid="quiz-editor"]', { timeout: 10_000 });

    // Ajouter 7 questions QCM
    for (let i = 1; i <= 7; i++) {
      await page.getByRole('button', { name: /ajouter une question/i }).click();
      await page
        .locator(`[data-testid="question-text-${i - 1}"]`)
        .fill(`Question ${i} : quelle est la bonne réponse ?`);

      // Option A (correcte)
      await page.locator(`[data-testid="option-text-${i - 1}-0"]`).fill(`Réponse correcte ${i}`);
      await page.locator(`[data-testid="option-correct-${i - 1}-0"]`).check();

      // Option B
      await page.locator(`[data-testid="option-text-${i - 1}-1"]`).fill(`Réponse incorrecte ${i}`);

      // Explication
      await page
        .locator(`[data-testid="question-explanation-${i - 1}"]`)
        .fill(`Explication question ${i}`);
    }

    // Vérifier auto-save (toast succès ou indicator)
    await expect(page.getByText(/sauvegardé/i)).toBeVisible({ timeout: 5_000 });

    // Vérifier que le compteur de questions affiche 7
    await expect(page.getByText(/7 question/i)).toBeVisible();
  });

  test('quiz sans bonne réponse cochée — validation bloquante', async ({ page }) => {
    const email = process.env['PLAYWRIGHT_FORMATEUR_EMAIL'] ?? '';
    const password = process.env['PLAYWRIGHT_FORMATEUR_PASSWORD'] ?? '';
    const cursusId = process.env['PLAYWRIGHT_CURSUS_ID'] ?? '';
    const moduleId = process.env['PLAYWRIGHT_MODULE_ID_2'] ?? '';

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL(/\/(dashboard|profil|cohortes|$)/);

    await page.goto(`/cursus/${cursusId}/modules/${moduleId}/edit`);
    await page.waitForSelector('[data-testid="quiz-editor"]', { timeout: 10_000 });

    // Ajouter une question sans cocher de bonne réponse
    await page.getByRole('button', { name: /ajouter une question/i }).click();
    await page.locator('[data-testid="question-text-0"]').fill('Question sans bonne réponse ?');

    // Tenter de sauvegarder manuellement
    const saveBtn = page.getByRole('button', { name: /sauvegarder/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
    }

    // Vérifier que l'erreur de validation est affichée
    await expect(page.getByText(/au moins une bonne réponse/i)).toBeVisible({ timeout: 3_000 });
  });
});
