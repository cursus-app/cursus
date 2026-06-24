/**
 * Parcours E2E 4 — Stagiaire bloqué (ST-16.4)
 *
 * Flux : stagiaire clique "Je suis bloqué" → modal → notification formateur
 * → formateur répond → résolution visible côté stagiaire.
 *
 * Dépend de :
 * - ST-02.1 : auth
 * - EP-06 : système de blocage / alertes (non implémenté)
 * - Supabase Realtime : push notification formateur
 *
 * Skippé jusqu'à ce que PLAYWRIGHT_ENABLE_FULL_E2E soit activé.
 */
import { test, expect } from '@playwright/test';

test.describe('Stagiaire bloqué', () => {
  test.skip(
    !process.env['PLAYWRIGHT_ENABLE_FULL_E2E'],
    "Feature incomplète — nécessite le système d'alertes (EP-06) et Supabase Realtime",
  );

  test('stagiaire clique "bloqué" → modal → notif formateur → résolution', async ({
    browser,
  }) => {
    // Deux contextes isolés : un pour le stagiaire, un pour le formateur
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
      // Authentifier le stagiaire
      await stagiairePage.goto('/login');
      await stagiairePage.getByLabel('Email').fill(stagiaireEmail);
      await stagiairePage.getByLabel('Mot de passe').fill(stagiairePwd);
      await stagiairePage.getByRole('button', { name: /se connecter/i }).click();
      await stagiairePage.waitForURL(/\/(dashboard|profil|cohortes|$)/);

      // Authentifier le formateur
      await formateurPage.goto('/login');
      await formateurPage.getByLabel('Email').fill(formateurEmail);
      await formateurPage.getByLabel('Mot de passe').fill(formateurPwd);
      await formateurPage.getByRole('button', { name: /se connecter/i }).click();
      await formateurPage.waitForURL(/\/(dashboard|profil|cohortes|$)/);

      // Stagiaire : cliquer sur "Je suis bloqué"
      await stagiairePage.goto('/mon-cursus/semaine-2');
      await stagiairePage.getByRole('button', { name: /je suis bloqué/i }).click();

      // Modal de blocage
      const modal = stagiairePage.getByRole('dialog');
      await expect(modal).toBeVisible();
      await stagiairePage
        .getByLabel(/décrivez votre blocage/i)
        .fill('Je ne comprends pas comment configurer Prisma avec le pool de connexions.');
      await stagiairePage.getByRole('button', { name: /envoyer/i }).click();

      // Notification visible pour le formateur (Realtime push)
      await formateurPage.goto('/dashboard');
      await expect(
        formateurPage.getByText(/stagiaire bloqué/i),
      ).toBeVisible({ timeout: 15_000 });

      // Formateur répond
      await formateurPage.getByRole('button', { name: /répondre/i }).first().click();
      await formateurPage
        .getByLabel(/votre réponse/i)
        .fill('Voici un lien vers la doc Prisma : https://prisma.io/docs');
      await formateurPage.getByRole('button', { name: /envoyer la réponse/i }).click();

      // Stagiaire voit la réponse (Realtime)
      await expect(
        stagiairePage.getByText(/voici un lien vers la doc prisma/i),
      ).toBeVisible({ timeout: 15_000 });

      // Stagiaire marque comme résolu
      await stagiairePage.getByRole('button', { name: /marquer comme résolu/i }).click();
      await expect(stagiairePage.getByText(/résolu/i)).toBeVisible();
    } finally {
      await stagiaireCtx.close();
      await formateurCtx.close();
    }
  });
});
