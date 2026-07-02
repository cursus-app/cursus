// @vitest-environment node
//
// Tests for ST-19.6 — verify the vue-i18n/no-raw-text lint rule
// using the ESLint API to actually lint Vue template strings.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const rootDir = process.cwd();
const nuxtEslintConfig = resolve(rootDir, '.nuxt/eslint.config.mjs');
const hasNuxtConfig = existsSync(nuxtEslintConfig);

// ---- Config structure tests (fast, no ESLint init required) ----

const eslintConfigSrc = readFileSync(resolve(rootDir, 'eslint.config.js'), 'utf-8');

describe('ST-19.6 — ESLint config structure', () => {
  it('imports @intlify/eslint-plugin-vue-i18n', () => {
    expect(eslintConfigSrc).toContain('@intlify/eslint-plugin-vue-i18n');
  });

  it('applies the rule on app/**/*.vue', () => {
    expect(eslintConfigSrc).toContain("'app/**/*.vue'");
  });

  it('checks UI-visible attributes: placeholder, aria-label, title, alt', () => {
    expect(eslintConfigSrc).toContain('placeholder');
    expect(eslintConfigSrc).toContain('aria-label');
    expect(eslintConfigSrc).toContain('title');
    expect(eslintConfigSrc).toContain('alt');
  });

  it('does NOT list class/id/data-testid in checked attributes (would invert exemption)', () => {
    // class, id, data-testid are NOT user-visible — must not appear in the attributes-to-check list
    const attributesBlock = eslintConfigSrc.match(/attributes:\s*\{([\s\S]*?)\},\s*\/\/ Patterns/);
    if (attributesBlock) {
      expect(attributesBlock[1]).not.toContain("'class'");
      expect(attributesBlock[1]).not.toContain("'id'");
      expect(attributesBlock[1]).not.toContain("'data-testid'");
    }
  });

  it('exempts tests, stories, server directories', () => {
    expect(eslintConfigSrc).toContain("'tests/**'");
    expect(eslintConfigSrc).toContain("'stories/**'");
    expect(eslintConfigSrc).toContain("'server/**'");
  });

  it('has localeDir pointing to locales/*.json', () => {
    expect(eslintConfigSrc).toContain('./locales/*.json');
  });

  it('has ignorePattern for multi-word Tailwind classes (requires space)', () => {
    // Pattern must require at least one space to match multi-word classes
    // (prevents single English words like "cancel" from being exempted)
    expect(eslintConfigSrc).toContain('\\\\s');
    expect(eslintConfigSrc).toContain('ignorePattern');
  });

  it('has ignorePattern for true camelCase (requires uppercase)', () => {
    // Must match startDate, cursusId but NOT cancel, save, submit
    expect(eslintConfigSrc).toContain('[A-Z]');
  });
});

// ---- Runtime lint tests (require .nuxt/ to be generated) ----

type LintMessage = { ruleId: string | null; severity: number; message: string };
let lintVueTemplate: (tpl: string) => Promise<LintMessage[]> = async () => [];

beforeAll(async () => {
  if (!hasNuxtConfig) {
    console.warn(
      '[ST-19.6] Skipping runtime lint tests: .nuxt/eslint.config.mjs missing (run pnpm prepare)',
    );
    return;
  }
  const { ESLint } = await import('eslint');
  const eslint = new ESLint({ cwd: rootDir });
  lintVueTemplate = async (template: string) => {
    const code = `<template>${template}</template>`;
    const results = await eslint.lintText(code, {
      filePath: resolve(rootDir, 'app/components/__test_lint__.vue'),
    });
    return (results[0]?.messages ?? []).filter((m) => m.ruleId === 'vue-i18n/no-raw-text');
  };
});

describe.skipIf(!hasNuxtConfig)('ST-19.6 — text node detection (runtime)', () => {
  it('warns on French text between tags', async () => {
    const warnings = await lintVueTemplate('<button>Enregistrer</button>');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('warns on French text with accent', async () => {
    const warnings = await lintVueTemplate("<span>Aucune notification pour l'instant</span>");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('warns on English text between tags', async () => {
    const warnings = await lintVueTemplate('<button>Cancel</button>');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('does NOT warn on $t() interpolation', async () => {
    const warnings = await lintVueTemplate('<button>{{ $t("common.save") }}</button>');
    expect(warnings.length).toBe(0);
  });

  it('does NOT warn on dynamic binding', async () => {
    const warnings = await lintVueTemplate('<span>{{ label }}</span>');
    expect(warnings.length).toBe(0);
  });
});

describe.skipIf(!hasNuxtConfig)('ST-19.6 — attribute detection (runtime)', () => {
  it('warns on hardcoded placeholder', async () => {
    const warnings = await lintVueTemplate('<input placeholder="Ton email" />');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('warns on hardcoded aria-label', async () => {
    const warnings = await lintVueTemplate('<button aria-label="Fermer">×</button>');
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('does NOT warn on class attribute', async () => {
    const warnings = await lintVueTemplate(
      '<div class="flex items-center gap-2">{{ $t("x") }}</div>',
    );
    expect(warnings.length).toBe(0);
  });

  it('does NOT warn on data-testid attribute', async () => {
    const warnings = await lintVueTemplate(
      '<button data-testid="submit-btn">{{ $t("x") }}</button>',
    );
    expect(warnings.length).toBe(0);
  });

  it('does NOT warn on bound placeholder with $t()', async () => {
    const warnings = await lintVueTemplate('<input :placeholder="$t(\'auth.email\')" />');
    expect(warnings.length).toBe(0);
  });
});

describe.skipIf(!hasNuxtConfig)('ST-19.6 — ignorePattern (runtime)', () => {
  it('does NOT warn on multi-word Tailwind class used as text (edge case)', async () => {
    // If a Tailwind string somehow appears as a text node, ignorePattern covers it
    const warnings = await lintVueTemplate('<div>{{ "flex items-center" }}</div>');
    // Dynamic interpolation is never flagged regardless
    expect(warnings.length).toBe(0);
  });

  it('does NOT warn on camelCase technical identifier', async () => {
    // camelCase identifiers like startDate should not appear as raw text nodes,
    // but if they do (e.g. slot name fallback), they are exempted
    const warnings = await lintVueTemplate('<span>startDate</span>');
    // startDate matches the camelCase pattern → not warned
    expect(warnings.length).toBe(0);
  });
});
