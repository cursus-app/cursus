/**
 * Fixtures Playwright étendues pour Cursus.
 *
 * Expose deux fixtures de page pré-authentifiées :
 * - stagiairePage : page connectée avec le compte PLAYWRIGHT_STAGIAIRE_EMAIL
 * - formateurPage : page connectée avec le compte PLAYWRIGHT_FORMATEUR_EMAIL
 *   (dans un contexte browser isolé pour ne pas interférer avec stagiairePage)
 *
 * Si les variables d'environnement ne sont pas définies, les pages sont fournies
 * sans authentification (les tests qui en ont besoin doivent appeler test.skip).
 */
import { test as base, type Page } from '@playwright/test';
import { loginAs } from './auth';

type CursusFixtures = {
  /** Page connectée en tant que stagiaire de test */
  stagiairePage: Page;
  /** Page connectée en tant que formateur de test (contexte isolé) */
  formateurPage: Page;
};

export const test = base.extend<CursusFixtures>({
  stagiairePage: async ({ page }, use) => {
    const email = process.env['PLAYWRIGHT_STAGIAIRE_EMAIL'];
    const password = process.env['PLAYWRIGHT_STAGIAIRE_PASSWORD'];

    if (email && password) {
      await loginAs(page, email, password);
    }

    await use(page);
  },

  formateurPage: async ({ browser }, use) => {
    const email = process.env['PLAYWRIGHT_FORMATEUR_EMAIL'];
    const password = process.env['PLAYWRIGHT_FORMATEUR_PASSWORD'];

    const context = await browser.newContext();
    const page = await context.newPage();

    if (email && password) {
      await loginAs(page, email, password);
    }

    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
