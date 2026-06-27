// @vitest-environment node
//
// Tests unitaires — shared/schemas/submission.ts (ST-05.2)
// Valide la regex GitHub, l'URL de déploiement, et les constantes anti-spam.
import { describe, it, expect } from 'vitest';
import {
  SubmitDelivrableSchema,
  GITHUB_REPO_URL_REGEX,
  SUBMISSION_SPAM_LIMIT,
} from '~~/shared/schemas/submission';

// ─── GITHUB_REPO_URL_REGEX ────────────────────────────────────────────────────

describe('GITHUB_REPO_URL_REGEX', () => {
  it('accepte une URL GitHub valide', () => {
    expect(GITHUB_REPO_URL_REGEX.test('https://github.com/johndoe/mon-projet')).toBe(true);
    expect(GITHUB_REPO_URL_REGEX.test('https://github.com/org-name/repo.name')).toBe(true);
    expect(GITHUB_REPO_URL_REGEX.test('https://github.com/johndoe/repo/')).toBe(true);
    expect(GITHUB_REPO_URL_REGEX.test('https://github.com/johndoe/repo_with_underscores')).toBe(
      true,
    );
  });

  it("rejette une URL qui n'est pas GitHub", () => {
    expect(GITHUB_REPO_URL_REGEX.test('https://gitlab.com/johndoe/repo')).toBe(false);
    expect(GITHUB_REPO_URL_REGEX.test('https://bitbucket.org/johndoe/repo')).toBe(false);
    expect(GITHUB_REPO_URL_REGEX.test('http://github.com/johndoe/repo')).toBe(false);
    expect(GITHUB_REPO_URL_REGEX.test('https://example.com')).toBe(false);
  });

  it("rejette github.com sans path complet (org/repo manquant)", () => {
    expect(GITHUB_REPO_URL_REGEX.test('https://github.com/johndoe')).toBe(false);
    expect(GITHUB_REPO_URL_REGEX.test('https://github.com/')).toBe(false);
    expect(GITHUB_REPO_URL_REGEX.test('https://github.com')).toBe(false);
  });

  it("rejette les URL malformées", () => {
    expect(GITHUB_REPO_URL_REGEX.test('not-a-url')).toBe(false);
    expect(GITHUB_REPO_URL_REGEX.test('')).toBe(false);
    expect(GITHUB_REPO_URL_REGEX.test('github.com/johndoe/repo')).toBe(false);
  });
});

// ─── SubmitDelivrableSchema ────────────────────────────────────────────────────

describe('SubmitDelivrableSchema', () => {
  it('valide une soumission minimale (sans deployUrl)', () => {
    const result = SubmitDelivrableSchema.safeParse({
      repoUrl: 'https://github.com/johndoe/mon-projet',
    });
    expect(result.success).toBe(true);
  });

  it('valide une soumission avec deployUrl https', () => {
    const result = SubmitDelivrableSchema.safeParse({
      repoUrl: 'https://github.com/johndoe/mon-projet',
      deployUrl: 'https://mon-projet.vercel.app',
    });
    expect(result.success).toBe(true);
  });

  it('accepte deployUrl vide (champ optionnel)', () => {
    const result = SubmitDelivrableSchema.safeParse({
      repoUrl: 'https://github.com/johndoe/mon-projet',
      deployUrl: '',
    });
    expect(result.success).toBe(true);
  });

  it("rejette si repoUrl n'est pas un URL GitHub", () => {
    const result = SubmitDelivrableSchema.safeParse({
      repoUrl: 'https://gitlab.com/johndoe/repo',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('submission.errors.notGithubUrl');
    }
  });

  it('rejette si repoUrl est absent', () => {
    const result = SubmitDelivrableSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejette si deployUrl commence par http:// (non https)', () => {
    const result = SubmitDelivrableSchema.safeParse({
      repoUrl: 'https://github.com/johndoe/mon-projet',
      deployUrl: 'http://mon-projet.vercel.app',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('submission.errors.deployNotHttps');
    }
  });
});

// ─── Anti-spam constant ───────────────────────────────────────────────────────

describe('SUBMISSION_SPAM_LIMIT', () => {
  it('vaut 10', () => {
    expect(SUBMISSION_SPAM_LIMIT).toBe(10);
  });
});
