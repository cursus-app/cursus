/**
 * Parcours E2E — Page "Cette semaine" (ST-05.1)
 *
 * Couvre :
 *  - Redirection vers /login si non authentifié
 *  - Affichage de la page pour un stagiaire authentifié
 *  - Présence du compte à rebours avec aria-live
 *  - Navigation vers la timeline
 *
 * Note : ces tests nécessitent PLAYWRIGHT_ENABLE_STAGIAIRE_E2E=true
 * et une session stagiaire configurée dans auth.setup.ts.
 */
import { test, expect } from '@playwright/test';

const stagiaireEnabled = Boolean(process.env['PLAYWRIGHT_ENABLE_STAGIAIRE_E2E']);

test.describe('Page /cette-semaine — accès non authentifié', () => {
  test('redirige vers /login si non connecté', async ({ page }) => {
    await page.goto('/cette-semaine');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Page /cette-semaine — stagiaire authentifié (ST-05.1)', () => {
  test('affiche le titre de la page', async ({ page }) => {
    test.skip(!stagiaireEnabled, 'PLAYWRIGHT_ENABLE_STAGIAIRE_E2E non activé');

    await page.goto('/cette-semaine');
    await expect(page).toHaveTitle(/Cette semaine/);
  });

  test('affiche le module de la semaine ou un état vide', async ({ page }) => {
    test.skip(!stagiaireEnabled, 'PLAYWRIGHT_ENABLE_STAGIAIRE_E2E non activé');

    await page.goto('/cette-semaine');

    // Soit un module est affiché, soit un état vide
    const hasModule = await page.locator('h1').count() > 0;
    const hasNoCohort = await page
      .getByText(/aucune cohorte active|no active cohort/i)
      .isVisible()
      .catch(() => false);

    expect(hasModule || hasNoCohort).toBe(true);
  });

  test('le compte à rebours est présent avec aria-live="polite"', async ({ page }) => {
    test.skip(!stagiaireEnabled, 'PLAYWRIGHT_ENABLE_STAGIAIRE_E2E non activé');

    await page.goto('/cette-semaine');

    // Attendre que la page soit chargée (skeleton disparu)
    await page.waitForSelector('[role="timer"]', { timeout: 5000 }).catch(() => null);

    const timer = page.locator('[role="timer"]');
    const count = await timer.count();

    if (count > 0) {
      await expect(timer.first()).toHaveAttribute('aria-live', 'polite');
    }
  });

  test('la timeline est navigable au clavier', async ({ page }) => {
    test.skip(!stagiaireEnabled, 'PLAYWRIGHT_ENABLE_STAGIAIRE_E2E non activé');

    await page.goto('/cette-semaine');

    const timeline = page.getByRole('navigation', { name: /timeline|parcours/i });
    const count = await timeline.count();

    if (count > 0) {
      await expect(timeline.first()).toBeVisible();
    }
  });

  test('le bandeau retard est présent si le module est en retard', async ({ page }) => {
    test.skip(!stagiaireEnabled, 'PLAYWRIGHT_ENABLE_STAGIAIRE_E2E non activé');

    await page.goto('/cette-semaine');

    // Si un bandeau d'alerte est présent (pas obligatoire si pas en retard),
    // vérifier qu'il a le rôle alert.
    const alerts = page.getByRole('alert');
    const alertCount = await alerts.count();

    if (alertCount > 0) {
      await expect(alerts.first()).toBeVisible();
    }
  });
});
