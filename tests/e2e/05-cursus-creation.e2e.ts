/**
 * Parcours E2E 5 — Création cursus + cohorte + invitation stagiaires (ST-16.4)
 *
 * Flux : formateur crée un cursus → démarre une cohorte → invite des stagiaires
 * → stagiaires voient leur semaine 1.
 *
 * Dépend de :
 * - ST-02.1 : auth
 * - EP-03 : gestion des cursus (non implémenté)
 * - EP-04 : gestion des cohortes (non implémenté)
 * - ST-02.2 : invitations (non implémenté)
 *
 * Skippé jusqu'à ce que PLAYWRIGHT_ENABLE_FULL_E2E soit activé.
 */
import { test, expect } from '@playwright/test';

test.describe('Création cursus + cohorte', () => {
  test.skip(
    !process.env['PLAYWRIGHT_ENABLE_FULL_E2E'],
    'Feature incomplète — nécessite EP-03 (cursus) et EP-04 (cohortes)',
  );

  test('formateur crée un cursus → démarre cohorte → invite stagiaires', async ({ page }) => {
    // Les valeurs sont garanties non-vides par le gate PLAYWRIGHT_ENABLE_FULL_E2E
    const email = process.env['PLAYWRIGHT_FORMATEUR_EMAIL'] ?? '';
    const password = process.env['PLAYWRIGHT_FORMATEUR_PASSWORD'] ?? '';

    // Authentification formateur
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL(/\/(dashboard|profil|cohortes|$)/);

    // Étape 1 : Créer un cursus
    await page.goto('/cursus/nouveau');
    await page.getByLabel(/titre du cursus/i).fill('Web Dev Fullstack — Promo Test E2E');
    await page.getByLabel(/durée/i).fill('8');
    await page.getByRole('button', { name: /créer le cursus/i }).click();

    await expect(page.getByText(/cursus créé/i)).toBeVisible({ timeout: 10_000 });

    // Étape 2 : Démarrer une cohorte
    await page.getByRole('button', { name: /démarrer une cohorte/i }).click();
    await page.getByLabel(/nom de la cohorte/i).fill('Promo Juin 2026');

    // Sélectionner une date de début
    const startDateInput = page.getByLabel(/date de début/i);
    await startDateInput.fill('2026-07-01');

    await page.getByRole('button', { name: /lancer la cohorte/i }).click();
    await expect(page.getByText(/cohorte démarrée/i)).toBeVisible({ timeout: 10_000 });

    // Étape 3 : Inviter des stagiaires
    await page.getByRole('button', { name: /inviter des stagiaires/i }).click();

    const stagiaireEmails = [
      'stagiaire1-e2e@test.cursus.app',
      'stagiaire2-e2e@test.cursus.app',
    ];

    for (const stagEmail of stagiaireEmails) {
      await page.getByLabel(/email du stagiaire/i).fill(stagEmail);
      await page.getByRole('button', { name: /ajouter/i }).click();
    }

    await page.getByRole('button', { name: /envoyer les invitations/i }).click();
    await expect(
      page.getByText(/2 invitations envoyées/i),
    ).toBeVisible({ timeout: 10_000 });

    // Vérifier que les invitations apparaissent dans la liste
    for (const stagEmail of stagiaireEmails) {
      await expect(page.getByText(stagEmail)).toBeVisible();
    }
  });

  test('formateur ne peut pas démarrer une cohorte sans cursus valide', async ({ page }) => {
    const email = process.env['PLAYWRIGHT_FORMATEUR_EMAIL'] ?? '';
    const password = process.env['PLAYWRIGHT_FORMATEUR_PASSWORD'] ?? '';

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Mot de passe').fill(password);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await page.waitForURL(/\/(dashboard|profil|cohortes|$)/);

    await page.goto('/cohortes/nouveau');
    // Tenter de démarrer sans sélectionner de cursus
    await page.getByRole('button', { name: /lancer la cohorte/i }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });
  });
});
