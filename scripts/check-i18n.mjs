#!/usr/bin/env node
/**
 * scripts/check-i18n.mjs
 *
 * Vérifie que toutes les clés t('...') / $t('...') utilisées dans app/
 * existent dans locales/fr.json et locales/en.json.
 *
 * Usage :
 *   node scripts/check-i18n.mjs
 *   pnpm check:i18n
 *
 * Exit code :
 *   0 — OK (clés manquantes dans en.json ne bloquent pas)
 *   1 — Clé(s) manquante(s) dans fr.json
 */

/* eslint-disable no-console */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

// ── File discovery ──────────────────────────────────────────────────────────

const IGNORED_DIRS = new Set(['node_modules', '.nuxt', '.output', 'dist', '.git', 'coverage']);

/**
 * @param {string} dir
 * @param {string[]} extensions
 * @returns {string[]}
 */
function findFiles(dir, extensions) {
  /** @type {string[]} */
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const name = typeof entry === 'string' ? entry : entry.name;
    if (IGNORED_DIRS.has(name)) {
      continue;
    }
    const fullPath = join(dir, name);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      results.push(...findFiles(fullPath, extensions));
    } else if (extensions.includes(extname(name))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Key extraction ──────────────────────────────────────────────────────────

/**
 * @typedef {{ key: string | null, isDynamic: boolean, raw?: string, filePath: string, line: number }} KeyRef
 */

/**
 * Extract all t() / $t() key references from file content.
 * Template-literal calls with interpolation are flagged as dynamic.
 *
 * Negative lookbehind `(?<![a-zA-Z0-9_])` prevents matching suffixes of
 * other identifiers (e.g. `createElement('a')` → no match).
 *
 * @param {string} content
 * @param {string} filePath
 * @returns {KeyRef[]}
 */
function extractKeys(content, filePath) {
  /** @type {KeyRef[]} */
  const refs = [];

  // Template literal calls: t(`...`) or $t(`...`)
  // Lookbehind avoids matching identifier suffixes.
  const templateLiteralRe = /(?<!\w)\$?t\(`([^`]*)`\)/g;
  let match;
  while ((match = templateLiteralRe.exec(content)) !== null) {
    const raw = match[1] ?? '';
    const line = content.slice(0, match.index).split('\n').length;
    if (raw.includes('${')) {
      // Dynamic interpolation — cannot statically analyse
      refs.push({ key: null, isDynamic: true, raw, filePath, line });
    } else {
      // Static template literal (no interpolation)
      refs.push({ key: raw, isDynamic: false, filePath, line });
    }
  }

  // Static string calls: t('key') / t("key") / $t('key') / $t("key")
  // Lookbehind avoids matching identifier suffixes like `format('key')`.
  const staticKeyRe = /(?<!\w)\$?t\(['"]([a-zA-Z0-9._-]+)['"]\)/g;
  while ((match = staticKeyRe.exec(content)) !== null) {
    const key = match[1] ?? '';
    const line = content.slice(0, match.index).split('\n').length;
    refs.push({ key, isDynamic: false, filePath, line });
  }

  return refs;
}

// ── Locale helpers ──────────────────────────────────────────────────────────

/**
 * @param {string} filename
 * @returns {Record<string, unknown>}
 */
function readLocale(filename) {
  const content = readFileSync(join(rootDir, 'locales', filename), 'utf-8');
  return JSON.parse(content);
}

/**
 * Traverse an object along a dot-separated key path.
 *
 * @param {Record<string, unknown>} obj
 * @param {string} keyPath
 * @returns {unknown}
 */
function getNestedValue(obj, keyPath) {
  const parts = keyPath.split('.');
  /** @type {unknown} */
  let current = obj;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = /** @type {Record<string, unknown>} */ (current)[part];
  }
  return current;
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} keyPath
 * @returns {boolean}
 */
function hasKey(obj, keyPath) {
  return getNestedValue(obj, keyPath) !== undefined;
}

/**
 * Collect all dot-separated paths whose leaf value is the untranslated placeholder sentinel.
 *
 * @param {Record<string, unknown>} obj
 * @param {string} prefix
 * @returns {string[]}
 */
function findTodoKeys(obj, prefix = '') {
  /** @type {string[]} */
  const todos = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' && value === '__TODO__') {
      todos.push(fullKey);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      todos.push(...findTodoKeys(/** @type {Record<string, unknown>} */ (value), fullKey));
    }
  }
  return todos;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const appDir = join(rootDir, 'app');
const files = findFiles(appDir, ['.vue', '.ts']);

/** @type {KeyRef[]} */
const allRefs = [];
for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf-8');
  } catch {
    continue;
  }
  allRefs.push(...extractKeys(content, file));
}

const staticRefs = allRefs.filter((r) => !r.isDynamic && r.key !== null);
const dynamicRefs = allRefs.filter((r) => r.isDynamic);
const uniqueKeys = [...new Set(staticRefs.map((r) => r.key))];

console.log(
  `✓ ${uniqueKeys.length} unique keys found in code` +
    ` (${staticRefs.length} references, ${dynamicRefs.length} dynamic skipped)`,
);

if (dynamicRefs.length > 0) {
  for (const ref of dynamicRefs) {
    const rel = relative(rootDir, ref.filePath);
    console.log(`  ~ Dynamic key skipped: \`${ref.raw ?? ''}\` (${rel}:${ref.line})`);
  }
}

const frLocale = readLocale('fr.json');
const enLocale = readLocale('en.json');

// Missing in fr.json — deduplicated by key (first occurrence reported)
/** @type {Map<string, KeyRef>} */
const missingInFrMap = new Map();
for (const ref of staticRefs) {
  if (ref.key && !hasKey(frLocale, ref.key) && !missingInFrMap.has(ref.key)) {
    missingInFrMap.set(ref.key, ref);
  }
}

// Missing in en.json — deduplicated by key
/** @type {Map<string, KeyRef>} */
const missingInEnMap = new Map();
for (const ref of staticRefs) {
  if (ref.key && !hasKey(enLocale, ref.key) && !missingInEnMap.has(ref.key)) {
    missingInEnMap.set(ref.key, ref);
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

if (missingInFrMap.size === 0) {
  console.log('✓ All keys present in fr.json');
} else {
  for (const { key, filePath, line } of missingInFrMap.values()) {
    const rel = relative(rootDir, filePath);
    console.log(`✗ Missing in fr.json: ${key ?? ''} (${rel}:${line})`);
  }
}

if (missingInEnMap.size === 0) {
  console.log('✓ All keys present in en.json');
} else {
  for (const { key, filePath, line } of missingInEnMap.values()) {
    const rel = relative(rootDir, filePath);
    console.log(`⚠ Missing in en.json: ${key ?? ''} (${rel}:${line})`);
  }
}

const todos = findTodoKeys(enLocale);
if (todos.length > 0) {
  console.log(`⚠ ${todos.length} keys in en.json marked __TODO__`);
  for (const key of todos) {
    console.log(`  ~ ${key}`);
  }
} else {
  console.log('✓ No __TODO__ values in en.json');
}

// Exit code 1 only when fr.json is missing keys (fr = source of truth)
if (missingInFrMap.size > 0) {
  process.exit(1);
}
