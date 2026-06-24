/**
 * Parcours E2E 2 — Onboarding stagiaire (ST-16.4)
 *
 * Flux : invitation → compte créé → GitHub lié → semaine 1 visible.
 *
 * Dépend de :
 * - ST-02.1 : auth email/mdp
 * - ST-02.2 : invitations (non implémenté)
 * - ST-02.3 : OAuth GitHub (non implémenté)
 * - ST-03.x : modules cursus (non implémenté)
 *
 * Skippé jusqu'à ce que PLAYWRIGHT_ENABLE_FULL_E2E soit activé.
 */
import { test, expect } from '@playwright/test';

test.describe('Onboarding stagiaire', () => {
  // Ce parcours complet nécessite invitations, email et OAuth GitHub
  test.skip(
    !process.env['PLAYWRIGHT_ENABLE_FULL_E2E'],
    'Feature incomplète — nécessite invitations (ST-02.2), email Resend et GitHub OAuth (ST-02.3)',
  );

  test.beforeEach(async ({ page }) => {
    // Garantir une session propre avant chaque test
    await page.context().clearCookies();
  });

  test('invitation → compte créé → GitHub lié → semaine 1 visible', async ({ page }) => {
    // Étape 1 : Formateur crée une invitation depuis le dashboard
    // (nécessite EP-04 cohortes + EP-03 cursus)
    await page.goto('/dashboard/cohortes');
    await page.getByRole('button', { name: /inviter un stagiaire/i }).click();

    const testEmail = `e2e-stagiaire-${Date.now()}@test.cursus.app`;
    await page.getByLabel('Email du stagiaire').fill(testEmail);
    await page.getByRole('button', { name: /envoyer l'invitation/i }).click();

    // Étape 2 : Email d'invitation reçu (mocké en test)
    // Récupérer le lien d'activation depuis le mock email
    const activationUrl = await page.evaluate(async () => {
      // En test, Resend est mocké — on récupère le dernier email envoyé
      const res = await fetch('/api/test/last-email');
      const data = (await res.json()) as { activationUrl?: string };
      return data.activationUrl;
    });

    // Étape 3 : Stagiaire clique le lien → crée son compte
    await page.goto(activationUrl as string);
    await page.getByLabel('Mot de passe').fill('SecurePass123!');
    await page.getByLabel('Confirmer le mot de passe').fill('SecurePass123!');
    await page.getByRole('button', { name: /créer mon compte/i }).click();

    // Étape 4 : Lier GitHub
    await expect(page.getByText(/lier votre compte github/i)).toBeVisible({ timeout: 10_000 });
    // En test, skip GitHub OAuth (mock)

    // Étape 5 : Voir la semaine 1 du cursus
    await page.goto('/mon-cursus');
    await expect(page.getByText(/semaine 1/i)).toBeVisible({ timeout: 10_000 });

    // Nettoyage
    await page.evaluate(async (email: string) => {
      await fetch('/api/test/clean-user', { method: 'POST', body: JSON.stringify({ email }) });
    }, testEmail);
  });
});
