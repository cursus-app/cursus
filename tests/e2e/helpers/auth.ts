/**
 * Helpers d'authentification pour les tests E2E Playwright.
 *
 * Note : les fonctions loginAs / logout dépendent des pages /login et /profil
 * qui sont implémentées dans ST-02.1 (feat/ST-02.1-auth-email-mdp) — pas encore
 * mergées sur main au moment de ST-16.4. Elles sont prêtes pour quand la PR sera
 * intégrée.
 */
import type { Page } from '@playwright/test';

/**
 * Authentifie un utilisateur via le formulaire /login.
 * Attend la redirection post-login (dashboard, profil ou racine).
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: /se connecter/i }).click();
  // Attend une URL stable post-login
  await page.waitForURL(/\/(dashboard|profil|cohortes|$)/, { timeout: 15_000 });
}

/**
 * Déconnecte l'utilisateur courant.
 * Navigue vers /profil, clique sur "Se déconnecter", attend /login.
 */
export async function logout(page: Page): Promise<void> {
  await page.goto('/profil');
  await page.getByRole('button', { name: /se déconnecter/i }).click();
  await page.waitForURL('**/login', { timeout: 10_000 });
}
