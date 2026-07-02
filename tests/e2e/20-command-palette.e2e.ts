/**
 * Parcours E2E 20 — Command Palette (ST-20.1)
 *
 * Couvre les 3 scénarios Gherkin de la story :
 *  1. Cmd+K ouvre la palette et focus l'input
 *  2. Esc ferme et rend le focus à l'élément d'origine
 *  3. Click outside ferme la palette
 *
 * Skippés si PLAYWRIGHT_ENABLE_FULL_E2E n'est pas défini (défaut en CI preview).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ENABLE = !!process.env['PLAYWRIGHT_ENABLE_FULL_E2E'];

test.describe('Command Palette (Cmd+K)', () => {
  test.skip(!ENABLE, 'Skipped: set PLAYWRIGHT_ENABLE_FULL_E2E=1 to run');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test("AC1 — Cmd+K ouvre la palette et focus l'input", async ({ page }) => {
    await page.keyboard.press('Meta+k');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const input = dialog.getByRole('combobox');
    await expect(input).toBeFocused();
  });

  test('AC1 — Ctrl+K ouvre la palette sur Windows/Linux', async ({ page }) => {
    await page.keyboard.press('Control+k');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
  });

  test("AC2 — Esc ferme et rend le focus à l'élément d'origine", async ({ page }) => {
    const trigger = page.getByRole('link').first();
    await trigger.focus();

    await page.keyboard.press('Meta+k');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await expect(trigger).toBeFocused();
  });

  test('AC3 — Click outside ferme la palette', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.mouse.click(10, 10);
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('A11y — dialog a role="dialog" et aria-modal="true"', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby');
  });

  test('A11y — axe-core : 0 violation quand la palette est ouverte', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await expect(page.getByRole('dialog')).toBeVisible();

    const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();

    expect(results.violations).toHaveLength(0);
  });
});
