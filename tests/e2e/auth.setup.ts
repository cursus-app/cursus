/**
 * Setup d'authentification Playwright (ST-16.4).
 *
 * Exécuté une fois avant les autres projets (voir playwright.config.ts → project "setup").
 * Persiste la session dans tests/e2e/.auth/user.json pour être réutilisée par tous
 * les projets (chromium, firefox, webkit, mobile).
 *
 * Si PLAYWRIGHT_STAGIAIRE_EMAIL / PLAYWRIGHT_STAGIAIRE_PASSWORD ne sont pas définis,
 * le setup est silencieusement ignoré et les tests qui nécessitent une session
 * doivent vérifier leur propre condition de skip.
 *
 * Dépend de la page /login — disponible dès ST-02.1 mergé.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const authFile = path.join(import.meta.dirname, '.auth/user.json');

setup('authenticate as test stagiaire', async ({ page }) => {
  const email = process.env['PLAYWRIGHT_STAGIAIRE_EMAIL'];
  const password = process.env['PLAYWRIGHT_STAGIAIRE_PASSWORD'];

  if (!email || !password) {
    // Pas de credentials → créer un storageState vide pour que les tests qui
    // lisent ce fichier ne plantent pas avec ENOENT.
    const dir = path.dirname(authFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }, null, 2));
    return;
  }

  await page.goto('/login');

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();

  // La redirection post-login peut aller vers /dashboard, /profil ou /
  await page.waitForURL(/\/(dashboard|profil|cohortes|$)/, { timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/login/);

  // Persister la session
  await page.context().storageState({ path: authFile });
});
