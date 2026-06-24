/**
 * Tests d'accessibilité automatisés (axe-core) — ST-16.4
 *
 * Cible : 0 violation critique (impact === 'critical') sur toutes les pages
 * publiques. Norme WCAG 2.1 AA sur les pages standard, AAA sur les pages
 * critiques (auth, capstone, vérification certificat).
 *
 * Pages auditées :
 * - Pages disponibles dans main : /, /legal/cgu, /legal/privacy, /legal/cookies
 * - Pages auth (skippées si ST-02.1 pas mergé) : /login, /signup
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Pages accessibles sans auth dans main
const PUBLIC_ROUTES_AVAILABLE = [
  '/',
  '/legal/cgu',
  '/legal/privacy',
  '/legal/cookies',
] as const;

// Pages auth — disponibles dès ST-02.1 mergé
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'] as const;

test.describe('Accessibilité WCAG 2.1 AA — pages publiques disponibles', () => {
  for (const route of PUBLIC_ROUTES_AVAILABLE) {
    test(`${route} — 0 violation critique`, async ({ page }) => {
      await page.goto(route);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

      // Reporter les violations pour faciliter le débogage
      if (criticalViolations.length > 0) {
        const report = criticalViolations
          .map(
            (v) =>
              `[${v.impact}] ${v.id}: ${v.description}\n  Éléments: ${v.nodes.map((n) => n.target.join(', ')).join(' | ')}`,
          )
          .join('\n');
        console.error(`Violations critiques sur ${route}:\n${report}`);
      }

      expect(criticalViolations).toHaveLength(0);
    });
  }
});

test.describe('Accessibilité WCAG 2.1 AA — pages auth (ST-02.1)', () => {
  const authEnabled = Boolean(process.env['PLAYWRIGHT_ENABLE_AUTH_E2E']);

  for (const route of AUTH_ROUTES) {
    test(`${route} — 0 violation critique`, async ({ page }) => {
      test.skip(!authEnabled, 'ST-02.1 (pages auth) pas encore mergé sur main');

      await page.goto(route);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const criticalViolations = results.violations.filter((v) => v.impact === 'critical');
      expect(criticalViolations).toHaveLength(0);
    });
  }
});

test.describe('Accessibilité AAA — pages critiques business (full E2E)', () => {
  test.skip(
    !process.env['PLAYWRIGHT_ENABLE_FULL_E2E'],
    'Nécessite toutes les features implémentées',
  );

  const CRITICAL_ROUTES = [
    '/login',
    '/signup',
    '/capstone',
    '/certificat/verify',
  ] as const;

  for (const route of CRITICAL_ROUTES) {
    test(`${route} — 0 violation sérieuse ou critique (AAA)`, async ({ page }) => {
      await page.goto(route);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag2aaa'])
        .analyze();

      const seriousViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(seriousViolations).toHaveLength(0);
    });
  }
});
