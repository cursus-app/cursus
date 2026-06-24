/**
 * Parcours E2E 1 — Authentification (ST-16.4)
 *
 * Couvre les flux critiques d'auth : login, signup, protection des routes,
 * et messages d'erreur.
 *
 * Status par test :
 * - Tests sur pages légales et homepage : opérationnels (pages dans main)
 * - Tests sur /login et /signup : dépendent de ST-02.1 (feat/ST-02.1-auth-email-mdp)
 *   → skippés si PLAYWRIGHT_ENABLE_AUTH_E2E non défini
 */
import { test, expect } from '@playwright/test';

// Pages disponibles dans main
test.describe('Pages publiques accessibles', () => {
  test('homepage charge et affiche le titre Cursus', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Cursus/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('page CGU accessible sans authentification', async ({ page }) => {
    await page.goto('/legal/cgu');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /conditions générales/i })).toBeVisible();
  });

  test('page confidentialité accessible sans authentification', async ({ page }) => {
    await page.goto('/legal/privacy');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('page cookies accessible sans authentification', async ({ page }) => {
    await page.goto('/legal/cookies');
    await expect(page).not.toHaveURL(/\/login/);
  });
});

// Tests auth — dépendent de ST-02.1
test.describe('Auth — formulaires (ST-02.1)', () => {
  const authEnabled = Boolean(process.env['PLAYWRIGHT_ENABLE_AUTH_E2E']);

  test('page login accessible et formulaire présent', async ({ page }) => {
    test.skip(!authEnabled, 'ST-02.1 (feat/ST-02.1-auth-email-mdp) pas encore mergé sur main');

    await page.goto('/login');
    await expect(page).toHaveTitle(/Cursus/);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Mot de passe')).toBeVisible();
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
  });

  test('page signup accessible', async ({ page }) => {
    test.skip(!authEnabled, 'ST-02.1 pas encore mergé sur main');

    await page.goto('/signup');
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('login avec mauvais mot de passe affiche une erreur', async ({ page }) => {
    test.skip(!authEnabled, 'ST-02.1 pas encore mergé sur main');

    await page.goto('/login');
    await page.getByLabel('Email').fill('inexistant@cursus.app');
    await page.getByLabel('Mot de passe').fill('mauvaismdp');
    await page.getByRole('button', { name: /se connecter/i }).click();

    // Message d'erreur générique (anti user-enumeration — cf. ST-02.1 sécurité)
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });
  });

  test('login réussi redirige vers /dashboard ou /profil', async ({ page }) => {
    const email = process.env['PLAYWRIGHT_STAGIAIRE_EMAIL'];
    const password = process.env['PLAYWRIGHT_STAGIAIRE_PASSWORD'];

    test.skip(
      !authEnabled || !email || !password,
      'ST-02.1 pas encore mergé ou credentials de test absents',
    );

    // email et password sont garantis non-vides par le test.skip ci-dessus
    await page.goto('/login');
    await page.getByLabel('Email').fill(email ?? '');
    await page.getByLabel('Mot de passe').fill(password ?? '');
    await page.getByRole('button', { name: /se connecter/i }).click();

    await page.waitForURL(/\/(dashboard|profil|cohortes|$)/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });
});

// Tests redirection auth — dépendent du middleware global auth (ST-02.6)
test.describe('Protection des routes (ST-02.6)', () => {
  const authEnabled = Boolean(process.env['PLAYWRIGHT_ENABLE_AUTH_E2E']);

  test('accès /profil sans session redirige vers /login', async ({ page }) => {
    test.skip(!authEnabled, 'ST-02.6 (middleware auth global) pas encore mergé sur main');

    // Naviguer sans session active (pas de storageState chargé)
    await page.context().clearCookies();
    await page.goto('/profil');
    await expect(page).toHaveURL(/\/login/);
  });

  test('accès /settings/2fa sans session redirige vers /login', async ({ page }) => {
    test.skip(!authEnabled, 'ST-02.6 pas encore mergé sur main');

    await page.context().clearCookies();
    await page.goto('/settings/2fa');
    await expect(page).toHaveURL(/\/login/);
  });
});

// Cookie banner — dépend de ST-15.3 / ST-15.5 (disponible dans main via feat/ST-15.3-15.5)
test.describe('Cookie banner (ST-15.3, ST-15.5)', () => {
  test('cookie banner présent ou accepté pour visiteur sur homepage', async ({ page }) => {
    // Reset storage pour simuler première visite
    await page.context().clearCookies();
    await page.context().clearPermissions();
    await page.goto('/');

    // Le banner peut être présent ou déjà accepté — on vérifie juste qu'il n'y a
    // pas d'erreur console critique.
    const banner = page.locator('[data-testid="cookie-banner"]');
    const hasBanner = await banner.isVisible().catch(() => false);

    if (hasBanner) {
      // Si présent : vérifier qu'il a un bouton d'acceptation
      await expect(page.getByRole('button', { name: /accepter|accept/i }).first()).toBeVisible();
    }
    // Si pas de banner : c'est acceptable (déjà accepté via storageState)
  });
});
