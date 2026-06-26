/**
 * Tests unitaires pour shared/schemas/module.ts (ST-03.2 + ST-03.3 + ST-03.4).
 * Couvre : resourceSchema, harness checks, deliverableSpecSchema, moduleSchema,
 *          updateModuleSchema, ogScrapeRequestSchema.
 */
import { describe, it, expect } from 'vitest';
import {
  resourceSchema,
  deliverableSpecSchema,
  harnessCheckSchema,
  branchesCheckParamsSchema,
  lighthouseCheckParamsSchema,
  deployUpCheckParamsSchema,
  moduleSchema,
  updateModuleSchema,
  ogScrapeRequestSchema,
} from '~~/shared/schemas/module';

// ─── resourceSchema ────────────────────────────────────────────────────────────

describe('resourceSchema — validation', () => {
  const VALID_RESOURCE = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    url: 'https://developer.mozilla.org/fr/docs/Web/JavaScript',
    title: 'MDN JavaScript',
    type: 'article' as const,
    position: 0,
    status: 'active' as const,
  };

  it('parses a valid resource', () => {
    const result = resourceSchema.safeParse(VALID_RESOURCE);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid UUID id', () => {
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid URL', () => {
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects a title exceeding 100 characters', () => {
    const result = resourceSchema.safeParse({
      ...VALID_RESOURCE,
      title: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty title', () => {
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown resource type', () => {
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, type: 'unknown-type' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid resource types', () => {
    const types = ['link', 'video', 'pdf', 'article', 'doc', 'course'] as const;
    for (const type of types) {
      const result = resourceSchema.safeParse({ ...VALID_RESOURCE, type });
      expect(result.success).toBe(true);
    }
  });

  it('defaults status to "active" when not provided', () => {
    const { status: _status, ...withoutStatus } = VALID_RESOURCE;
    const result = resourceSchema.safeParse(withoutStatus);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('active');
    }
  });

  it('accepts optional duration', () => {
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, duration: 30 });
    expect(result.success).toBe(true);
  });

  it('rejects duration exceeding 600 minutes', () => {
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, duration: 601 });
    expect(result.success).toBe(false);
  });

  it('accepts optional OG fields as null', () => {
    const result = resourceSchema.safeParse({
      ...VALID_RESOURCE,
      ogTitle: null,
      ogImage: null,
      ogDescription: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a URL of exactly 2000 chars', () => {
    // https://example.com/ is 20 chars; 1980 'a's → total 2000
    const url = 'https://example.com/' + 'a'.repeat(1980);
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, url });
    expect(result.success).toBe(true);
  });

  it('rejects a URL exceeding 2000 chars (2001 chars)', () => {
    // https://example.com/ is 20 chars; 1981 'a's → total 2001
    const url = 'https://example.com/' + 'a'.repeat(1981);
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, url });
    expect(result.success).toBe(false);
  });

  it('rejects status values other than active/broken/checking', () => {
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, status: 'pending' });
    expect(result.success).toBe(false);
  });

  it('accepts status "broken"', () => {
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, status: 'broken' });
    expect(result.success).toBe(true);
  });

  it('accepts status "checking"', () => {
    const result = resourceSchema.safeParse({ ...VALID_RESOURCE, status: 'checking' });
    expect(result.success).toBe(true);
  });
});

// ─── branchesCheckParamsSchema ────────────────────────────────────────────────

describe('branchesCheckParamsSchema', () => {
  it('accepts valid branches list', () => {
    expect(
      branchesCheckParamsSchema.safeParse({ branches: ['main', 'feature/login'] }).success,
    ).toBe(true);
  });

  it('rejects empty branches array', () => {
    const r = branchesCheckParamsSchema.safeParse({ branches: [] });
    expect(r.success).toBe(false);
  });

  it('rejects branches array with more than 20 branches', () => {
    const r = branchesCheckParamsSchema.safeParse({
      branches: Array.from({ length: 21 }, (_, i) => `branch-${String(i)}`),
    });
    expect(r.success).toBe(false);
  });

  it('rejects branch name with spaces', () => {
    const r = branchesCheckParamsSchema.safeParse({ branches: ['my branch'] });
    expect(r.success).toBe(false);
  });

  it('rejects empty branch name', () => {
    const r = branchesCheckParamsSchema.safeParse({ branches: [''] });
    expect(r.success).toBe(false);
  });

  it('accepts branch names with slashes and dashes', () => {
    expect(
      branchesCheckParamsSchema.safeParse({
        branches: ['feature/login', 'fix/auth-bug', 'main'],
      }).success,
    ).toBe(true);
  });
});

// ─── lighthouseCheckParamsSchema ──────────────────────────────────────────────

describe('lighthouseCheckParamsSchema', () => {
  it('accepts valid score and categories', () => {
    expect(
      lighthouseCheckParamsSchema.safeParse({
        minScore: 80,
        categories: ['performance', 'accessibility'],
      }).success,
    ).toBe(true);
  });

  it('rejects minScore < 0', () => {
    const r = lighthouseCheckParamsSchema.safeParse({
      minScore: -1,
      categories: ['performance'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects minScore > 100', () => {
    const r = lighthouseCheckParamsSchema.safeParse({
      minScore: 101,
      categories: ['performance'],
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty categories', () => {
    const r = lighthouseCheckParamsSchema.safeParse({ minScore: 80, categories: [] });
    expect(r.success).toBe(false);
  });

  it('rejects invalid category name', () => {
    const r = lighthouseCheckParamsSchema.safeParse({
      minScore: 80,
      categories: ['invalid-cat'],
    });
    expect(r.success).toBe(false);
  });

  it('accepts minScore = 0 (lower boundary)', () => {
    expect(
      lighthouseCheckParamsSchema.safeParse({ minScore: 0, categories: ['performance'] }).success,
    ).toBe(true);
  });

  it('accepts minScore = 100 (upper boundary)', () => {
    expect(
      lighthouseCheckParamsSchema.safeParse({
        minScore: 100,
        categories: ['performance'],
      }).success,
    ).toBe(true);
  });
});

// ─── deployUpCheckParamsSchema ────────────────────────────────────────────────

describe('deployUpCheckParamsSchema', () => {
  it('accepts empty params (url optional)', () => {
    expect(deployUpCheckParamsSchema.safeParse({}).success).toBe(true);
  });

  it('accepts valid url', () => {
    expect(deployUpCheckParamsSchema.safeParse({ url: 'https://my-app.vercel.app' }).success).toBe(
      true,
    );
  });

  it('rejects invalid url', () => {
    expect(deployUpCheckParamsSchema.safeParse({ url: 'not-a-url' }).success).toBe(false);
  });
});

// ─── harnessCheckSchema ───────────────────────────────────────────────────────

describe('harnessCheckSchema — discriminated union', () => {
  it('accepts branches check with valid params', () => {
    const r = harnessCheckSchema.safeParse({
      type: 'branches',
      enabled: true,
      params: { branches: ['main', 'develop'] },
    });
    expect(r.success).toBe(true);
  });

  it('accepts linter_pass check (no params)', () => {
    const r = harnessCheckSchema.safeParse({
      type: 'linter_pass',
      enabled: false,
      params: {},
    });
    expect(r.success).toBe(true);
  });

  it('accepts readme_present check', () => {
    const r = harnessCheckSchema.safeParse({
      type: 'readme_present',
      enabled: true,
      params: {},
    });
    expect(r.success).toBe(true);
  });

  it('accepts signed_commits check', () => {
    const r = harnessCheckSchema.safeParse({
      type: 'signed_commits',
      enabled: false,
      params: {},
    });
    expect(r.success).toBe(true);
  });

  it('accepts tests_pass check', () => {
    const r = harnessCheckSchema.safeParse({ type: 'tests_pass', enabled: true, params: {} });
    expect(r.success).toBe(true);
  });

  it('accepts deploy_up check without url', () => {
    const r = harnessCheckSchema.safeParse({ type: 'deploy_up', enabled: true, params: {} });
    expect(r.success).toBe(true);
  });

  it('accepts deploy_up check with url', () => {
    const r = harnessCheckSchema.safeParse({
      type: 'deploy_up',
      enabled: true,
      params: { url: 'https://app.example.com' },
    });
    expect(r.success).toBe(true);
  });

  it('accepts lighthouse_score check', () => {
    const r = harnessCheckSchema.safeParse({
      type: 'lighthouse_score',
      enabled: true,
      params: { minScore: 90, categories: ['performance', 'accessibility'] },
    });
    expect(r.success).toBe(true);
  });

  it('rejects unknown check type', () => {
    const r = harnessCheckSchema.safeParse({
      type: 'unknown_check',
      enabled: true,
      params: {},
    });
    expect(r.success).toBe(false);
  });

  it('rejects branches check with invalid params', () => {
    const r = harnessCheckSchema.safeParse({
      type: 'branches',
      enabled: true,
      params: { branches: [] }, // empty branches
    });
    expect(r.success).toBe(false);
  });
});

// ─── deliverableSpecSchema ────────────────────────────────────────────────────

describe('deliverableSpecSchema', () => {
  it('accepts empty object with defaults', () => {
    const r = deliverableSpecSchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.description).toBe('');
      expect(r.data.repoRequired).toBe(true);
      expect(r.data.deployRequired).toBe(false);
      expect(r.data.checks).toEqual([]);
    }
  });

  it('accepts valid spec with checks', () => {
    const r = deliverableSpecSchema.safeParse({
      description: '## Livrable\nRépondre aux exigences.',
      repoRequired: true,
      deployRequired: false,
      checks: [
        { type: 'branches', enabled: true, params: { branches: ['main'] } },
        { type: 'linter_pass', enabled: false, params: {} },
      ],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.checks).toHaveLength(2);
    }
  });

  it('rejects spec with more than 15 checks', () => {
    const checks = Array.from({ length: 16 }, (_, i) => ({
      // cycle through valid types
      type: i % 2 === 0 ? 'linter_pass' : 'readme_present',
      enabled: true,
      params: {},
    }));
    const r = deliverableSpecSchema.safeParse({ checks });
    expect(r.success).toBe(false);
  });

  it('rejects description longer than 10000 characters', () => {
    const r = deliverableSpecSchema.safeParse({ description: 'x'.repeat(10_001) });
    expect(r.success).toBe(false);
  });

  it('accepts description of exactly 10000 characters', () => {
    const r = deliverableSpecSchema.safeParse({ description: 'x'.repeat(10_000) });
    expect(r.success).toBe(true);
  });
});

// ─── moduleSchema ─────────────────────────────────────────────────────────────

describe('moduleSchema', () => {
  it('accepts minimal valid module', () => {
    const r = moduleSchema.safeParse({ title: 'Semaine 1' });
    expect(r.success).toBe(true);
    if (r.success) {
      // deliverableSpecJson doit inclure les checks par défaut
      expect(r.data.deliverableSpecJson.checks).toEqual([]);
    }
  });

  it('rejects empty title', () => {
    const r = moduleSchema.safeParse({ title: '' });
    expect(r.success).toBe(false);
  });

  it('rejects title longer than 100 characters', () => {
    const r = moduleSchema.safeParse({ title: 'a'.repeat(101) });
    expect(r.success).toBe(false);
  });

  it('accepts module with full deliverable spec', () => {
    const r = moduleSchema.safeParse({
      title: 'Module test',
      deliverableSpecJson: {
        description: 'Crée une page de connexion.',
        repoRequired: true,
        deployRequired: true,
        checks: [
          { type: 'branches', enabled: true, params: { branches: ['main', 'feature/login'] } },
          { type: 'tests_pass', enabled: true, params: {} },
        ],
      },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.deliverableSpecJson.checks).toHaveLength(2);
    }
  });
});

// ─── updateModuleSchema ───────────────────────────────────────────────────────

describe('updateModuleSchema — validation', () => {
  const VALID_RESOURCE = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    url: 'https://developer.mozilla.org',
    title: 'MDN',
    type: 'link' as const,
    position: 0,
    status: 'active' as const,
  };

  it('accepts an empty object (all fields optional)', () => {
    const result = updateModuleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a valid resources array', () => {
    const result = updateModuleSchema.safeParse({ resources: [VALID_RESOURCE] });
    expect(result.success).toBe(true);
  });

  it('rejects more than 20 resources', () => {
    const resources = Array.from({ length: 21 }, (_, i) => ({
      ...VALID_RESOURCE,
      id: `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, '0')}`,
      position: i,
    }));
    const result = updateModuleSchema.safeParse({ resources });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 20 resources', () => {
    const resources = Array.from({ length: 20 }, (_, i) => ({
      ...VALID_RESOURCE,
      id: `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, '0')}`,
      position: i,
    }));
    const result = updateModuleSchema.safeParse({ resources });
    expect(result.success).toBe(true);
  });

  it('accepts an empty resources array', () => {
    const result = updateModuleSchema.safeParse({ resources: [] });
    expect(result.success).toBe(true);
  });

  it('accepts title up to 200 chars', () => {
    const result = updateModuleSchema.safeParse({ title: 'A'.repeat(200) });
    expect(result.success).toBe(true);
  });

  it('rejects title exceeding 200 chars', () => {
    const result = updateModuleSchema.safeParse({ title: 'A'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts week in range 1-52', () => {
    expect(updateModuleSchema.safeParse({ week: 1 }).success).toBe(true);
    expect(updateModuleSchema.safeParse({ week: 52 }).success).toBe(true);
  });

  it('rejects week outside range 1-52', () => {
    expect(updateModuleSchema.safeParse({ week: 0 }).success).toBe(false);
    expect(updateModuleSchema.safeParse({ week: 53 }).success).toBe(false);
  });

  it('coerces string week to number', () => {
    const result = updateModuleSchema.safeParse({ week: '5' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.week).toBe(5);
    }
  });

  it('accepts partial update with only deliverableSpecJson', () => {
    const r = updateModuleSchema.safeParse({
      deliverableSpecJson: {
        description: 'Mise à jour du livrable.',
        checks: [{ type: 'readme_present', enabled: true, params: {} }],
      },
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid check type in deliverableSpecJson', () => {
    const r = updateModuleSchema.safeParse({
      deliverableSpecJson: {
        checks: [{ type: 'invalid_type', enabled: true, params: {} }],
      },
    });
    expect(r.success).toBe(false);
  });
});

// ─── ogScrapeRequestSchema ────────────────────────────────────────────────────

describe('ogScrapeRequestSchema — validation', () => {
  it('accepts a valid HTTPS URL', () => {
    const result = ogScrapeRequestSchema.safeParse({ url: 'https://example.com' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid HTTP URL', () => {
    const result = ogScrapeRequestSchema.safeParse({ url: 'http://example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects a non-URL string', () => {
    const result = ogScrapeRequestSchema.safeParse({ url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects a URL exceeding 2000 chars (2001 chars)', () => {
    // https://example.com/ is 20 chars; 1981 'a's → total 2001
    const url = 'https://example.com/' + 'a'.repeat(1981);
    const result = ogScrapeRequestSchema.safeParse({ url });
    expect(result.success).toBe(false);
  });

  it('rejects when url field is missing', () => {
    const result = ogScrapeRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
