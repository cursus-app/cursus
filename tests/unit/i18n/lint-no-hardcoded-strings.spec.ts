// @vitest-environment node
//
// Tests for ST-19.6 — verifies the vue-i18n/no-raw-text lint rule is properly
// configured in eslint.config.js and the ignore patterns work as expected.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const eslintConfig = readFileSync(resolve(process.cwd(), 'eslint.config.js'), 'utf-8');

describe('ST-19.6 — ESLint vue-i18n/no-raw-text rule configuration', () => {
  it('imports @intlify/eslint-plugin-vue-i18n', () => {
    expect(eslintConfig).toContain('@intlify/eslint-plugin-vue-i18n');
  });

  it('configures vue-i18n/no-raw-text rule as warn', () => {
    expect(eslintConfig).toContain("'vue-i18n/no-raw-text'");
    expect(eslintConfig).toContain("'warn'");
  });

  it('exempts tests and stories directories', () => {
    expect(eslintConfig).toContain("'tests/**'");
    expect(eslintConfig).toContain("'stories/**'");
  });

  it('exempts server directory from the rule', () => {
    expect(eslintConfig).toContain("'server/**'");
  });

  it('targets app Vue files', () => {
    expect(eslintConfig).toContain("'app/**/*.vue'");
  });

  it('has ignorePattern for Tailwind CSS classes', () => {
    // The pattern must handle multi-word lowercase strings (Tailwind classes)
    expect(eslintConfig).toContain('ignorePattern');
    expect(eslintConfig).toContain('a-z0-9');
  });

  it('has ignorePattern for camelCase identifiers', () => {
    // camelCase tech identifiers like startDate, cursusId should be ignored
    expect(eslintConfig).toContain('[a-z][a-zA-Z0-9]');
  });

  it('has ignorePattern for anchor links (#main)', () => {
    expect(eslintConfig).toContain('#[a-zA-Z0-9_-]');
  });

  it('configures localeDir pointing to locales/*.json', () => {
    expect(eslintConfig).toContain('./locales/*.json');
  });
});

describe('ST-19.6 — ignore pattern logic verification', () => {
  // Reproduce the ignore pattern from eslint.config.js and test it
  const ignorePattern = new RegExp(
    [
      '^[a-z0-9][a-z0-9\\s:/.\\-\\[\\]!()]+$',
      '^[a-z0-9_-]+$',
      '^[a-z][a-zA-Z0-9]+$',
      '^#[a-zA-Z0-9_-]+$',
      '^https?://',
      '^/',
      '^[A-Z][A-Z0-9_]+$',
      '^[^a-zA-Z]{1,5}$',
      '^.$',
    ].join('|'),
  );

  it('ignores Tailwind CSS class strings', () => {
    expect(ignorePattern.test('flex items-center gap-2')).toBe(true);
    expect(ignorePattern.test('text-sm font-medium text-text-strong')).toBe(true);
    expect(ignorePattern.test('size-full object-cover')).toBe(true);
    expect(ignorePattern.test('animate-spin mr-2 size-4')).toBe(true);
  });

  it('ignores technical identifiers', () => {
    expect(ignorePattern.test('startDate')).toBe(true);
    expect(ignorePattern.test('cursusId')).toBe(true);
    expect(ignorePattern.test('repoUrl')).toBe(true);
    expect(ignorePattern.test('data-testid')).toBe(true);
  });

  it('ignores anchor links', () => {
    expect(ignorePattern.test('#main')).toBe(true);
    expect(ignorePattern.test('#content')).toBe(true);
  });

  it('ignores paths and URLs', () => {
    expect(ignorePattern.test('/dashboard')).toBe(true);
    expect(ignorePattern.test('https://example.com')).toBe(true);
  });

  it('ignores single characters and punctuation', () => {
    expect(ignorePattern.test('%')).toBe(true);
    expect(ignorePattern.test('@')).toBe(true);
    expect(ignorePattern.test('—')).toBe(true);
    expect(ignorePattern.test('·')).toBe(true);
  });

  it('does NOT ignore French user-visible text (should be flagged)', () => {
    expect(ignorePattern.test('Enregistrer')).toBe(false);
    expect(ignorePattern.test("Aucune notification pour l'instant")).toBe(false);
    expect(ignorePattern.test('Voir toutes les notifications')).toBe(false);
    expect(ignorePattern.test('Bienvenue sur Cursus')).toBe(false);
    expect(ignorePattern.test("Retour à l'accueil")).toBe(false);
  });

  it('does NOT ignore English user-visible text starting with capital', () => {
    expect(ignorePattern.test('Save changes')).toBe(false);
    expect(ignorePattern.test('Cancel')).toBe(false);
    expect(ignorePattern.test('Submit')).toBe(false);
  });
});
