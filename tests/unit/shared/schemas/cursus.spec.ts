import { describe, expect, it } from 'vitest';
import {
  createCursusSchema,
  cursusDomainsEnum,
  cursusLevelEnum,
  cursusStatusEnum,
  listCursusQuerySchema,
  updateCursusSchema,
} from '~~/shared/schemas/cursus';

// ─── cursusDomainsEnum ────────────────────────────────────────────────────────

describe('cursusDomainsEnum', () => {
  it('accepts all valid domains', () => {
    for (const domain of ['dev-web', 'ingenierie-web', 'ia', 'cybersec', 'autre'] as const) {
      expect(cursusDomainsEnum.safeParse(domain).success).toBe(true);
    }
  });

  it('rejects unknown domain', () => {
    expect(cursusDomainsEnum.safeParse('blockchain').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(cursusDomainsEnum.safeParse('').success).toBe(false);
  });
});

// ─── cursusLevelEnum ──────────────────────────────────────────────────────────

describe('cursusLevelEnum', () => {
  it('accepts BEGINNER, INTERMEDIATE, ADVANCED', () => {
    for (const level of ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const) {
      expect(cursusLevelEnum.safeParse(level).success).toBe(true);
    }
  });

  it('rejects lowercase level', () => {
    expect(cursusLevelEnum.safeParse('beginner').success).toBe(false);
  });

  it('rejects unknown level EXPERT', () => {
    expect(cursusLevelEnum.safeParse('EXPERT').success).toBe(false);
  });
});

// ─── cursusStatusEnum ─────────────────────────────────────────────────────────

describe('cursusStatusEnum', () => {
  it('accepts DRAFT, PUBLISHED, ARCHIVED', () => {
    for (const status of ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const) {
      expect(cursusStatusEnum.safeParse(status).success).toBe(true);
    }
  });

  it('rejects PENDING', () => {
    expect(cursusStatusEnum.safeParse('PENDING').success).toBe(false);
  });
});

// ─── createCursusSchema ───────────────────────────────────────────────────────

describe('createCursusSchema', () => {
  const validBase = {
    title: 'Mon Cursus Dev Web',
    domain: 'dev-web',
    level: 'BEGINNER',
    durationWeeks: 12,
  };

  it('accepts valid minimal input', () => {
    expect(createCursusSchema.safeParse(validBase).success).toBe(true);
  });

  it('accepts valid full input including all optional fields', () => {
    const result = createCursusSchema.safeParse({
      ...validBase,
      description: 'Une belle description.',
      prerequisites: 'Savoir coder.',
      slug: 'mon-cursus-dev-web',
    });
    expect(result.success).toBe(true);
  });

  // ── title ──────────────────────────────────────────────────────────────────

  it('rejects missing title', () => {
    const { title: _omitted, ...noTitle } = validBase;
    expect(createCursusSchema.safeParse(noTitle).success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = createCursusSchema.safeParse({ ...validBase, title: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.titleRequired');
  });

  it('rejects title of 201 characters (max is 200)', () => {
    const result = createCursusSchema.safeParse({ ...validBase, title: 'a'.repeat(201) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.titleTooLong');
  });

  it('accepts title of exactly 200 characters', () => {
    expect(createCursusSchema.safeParse({ ...validBase, title: 'a'.repeat(200) }).success).toBe(true);
  });

  // ── domain ─────────────────────────────────────────────────────────────────

  it('rejects invalid domain', () => {
    expect(createCursusSchema.safeParse({ ...validBase, domain: 'marketing' }).success).toBe(false);
  });

  // ── level ──────────────────────────────────────────────────────────────────

  it('rejects invalid level', () => {
    expect(createCursusSchema.safeParse({ ...validBase, level: 'MASTER' }).success).toBe(false);
  });

  // ── durationWeeks ──────────────────────────────────────────────────────────

  it('rejects durationWeeks = 0 (min is 1)', () => {
    const result = createCursusSchema.safeParse({ ...validBase, durationWeeks: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.durationInvalid');
  });

  it('rejects durationWeeks = 53 (max is 52)', () => {
    const result = createCursusSchema.safeParse({ ...validBase, durationWeeks: 53 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.durationInvalid');
  });

  it('accepts durationWeeks = 1 (lower boundary)', () => {
    expect(createCursusSchema.safeParse({ ...validBase, durationWeeks: 1 }).success).toBe(true);
  });

  it('accepts durationWeeks = 52 (upper boundary)', () => {
    expect(createCursusSchema.safeParse({ ...validBase, durationWeeks: 52 }).success).toBe(true);
  });

  it('rejects non-integer durationWeeks (float 5.5)', () => {
    expect(createCursusSchema.safeParse({ ...validBase, durationWeeks: 5.5 }).success).toBe(false);
  });

  it('coerces string durationWeeks to number (form data behaviour)', () => {
    const result = createCursusSchema.safeParse({ ...validBase, durationWeeks: '12' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.durationWeeks).toBe(12);
    }
  });

  // ── description / prerequisites ────────────────────────────────────────────

  it('rejects description longer than 5000 characters', () => {
    expect(
      createCursusSchema.safeParse({ ...validBase, description: 'x'.repeat(5001) }).success,
    ).toBe(false);
  });

  it('accepts description of exactly 5000 characters', () => {
    expect(
      createCursusSchema.safeParse({ ...validBase, description: 'x'.repeat(5000) }).success,
    ).toBe(true);
  });

  it('accepts undefined description (optional field)', () => {
    const { ...base } = validBase;
    expect(createCursusSchema.safeParse(base).success).toBe(true);
  });

  // ── slug ───────────────────────────────────────────────────────────────────

  it('accepts valid slug format (lowercase alphanumeric and dashes)', () => {
    expect(createCursusSchema.safeParse({ ...validBase, slug: 'mon-cursus-123' }).success).toBe(true);
  });

  it('rejects slug with uppercase letters', () => {
    const result = createCursusSchema.safeParse({ ...validBase, slug: 'Mon-Cursus' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.slugInvalid');
  });

  it('rejects slug with underscores', () => {
    const result = createCursusSchema.safeParse({ ...validBase, slug: 'mon_cursus' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.slugInvalid');
  });

  it('rejects slug with spaces', () => {
    const result = createCursusSchema.safeParse({ ...validBase, slug: 'mon cursus' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.slugInvalid');
  });

  it('rejects slug shorter than 3 characters', () => {
    const result = createCursusSchema.safeParse({ ...validBase, slug: 'ab' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.slugInvalid');
  });

  it('rejects slug longer than 80 characters', () => {
    const result = createCursusSchema.safeParse({ ...validBase, slug: 'a'.repeat(81) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.slugInvalid');
  });

  it('accepts slug of exactly 3 characters (lower boundary)', () => {
    expect(createCursusSchema.safeParse({ ...validBase, slug: 'abc' }).success).toBe(true);
  });

  it('accepts slug of exactly 80 characters (upper boundary)', () => {
    expect(createCursusSchema.safeParse({ ...validBase, slug: 'a'.repeat(80) }).success).toBe(true);
  });

  it('accepts undefined slug (auto-generated on server)', () => {
    const result = createCursusSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBeUndefined();
    }
  });
});

// ─── updateCursusSchema ───────────────────────────────────────────────────────

describe('updateCursusSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(updateCursusSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update with only title', () => {
    expect(updateCursusSchema.safeParse({ title: 'Updated Title' }).success).toBe(true);
  });

  it('accepts partial update with only domain', () => {
    expect(updateCursusSchema.safeParse({ domain: 'ia' }).success).toBe(true);
  });

  it('validates title when present — rejects too long', () => {
    const result = updateCursusSchema.safeParse({ title: 'a'.repeat(201) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.titleTooLong');
  });

  it('validates title when present — rejects empty', () => {
    const result = updateCursusSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.titleRequired');
  });

  it('validates domain when present — rejects invalid value', () => {
    expect(updateCursusSchema.safeParse({ domain: 'unknown-domain' }).success).toBe(false);
  });

  it('validates level when present — rejects invalid value', () => {
    expect(updateCursusSchema.safeParse({ level: 'MASTER' }).success).toBe(false);
  });

  it('validates durationWeeks when present — rejects 0', () => {
    const result = updateCursusSchema.safeParse({ durationWeeks: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.durationInvalid');
  });

  it('validates slug when present — rejects invalid format (uppercase)', () => {
    const result = updateCursusSchema.safeParse({ slug: 'Invalid_Slug' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('cursus.errors.slugInvalid');
  });

  it('accepts a complete valid update', () => {
    const result = updateCursusSchema.safeParse({
      title: 'New Title',
      domain: 'ia',
      level: 'ADVANCED',
      durationWeeks: 24,
      description: 'Updated description',
      slug: 'new-slug-v2',
    });
    expect(result.success).toBe(true);
  });
});

// ─── listCursusQuerySchema ────────────────────────────────────────────────────

describe('listCursusQuerySchema', () => {
  it('uses page=1 and limit=20 as defaults when no params provided', () => {
    const result = listCursusQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('coerces string page and limit to numbers (URL query params are strings)', () => {
    const result = listCursusQuerySchema.parse({ page: '3', limit: '50' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('rejects page = 0 (min is 1)', () => {
    expect(listCursusQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('rejects limit = 0 (min is 1)', () => {
    expect(listCursusQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('rejects limit = 101 (max is 100)', () => {
    expect(listCursusQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('accepts limit = 100 (upper boundary)', () => {
    expect(listCursusQuerySchema.safeParse({ limit: 100 }).success).toBe(true);
  });

  it('accepts limit = 1 (lower boundary)', () => {
    expect(listCursusQuerySchema.safeParse({ limit: 1 }).success).toBe(true);
  });

  it('accepts valid status filter PUBLISHED', () => {
    const result = listCursusQuerySchema.safeParse({ status: 'PUBLISHED' });
    expect(result.success).toBe(true);
    if (result.success) {expect(result.data.status).toBe('PUBLISHED');}
  });

  it('accepts valid status filter DRAFT', () => {
    const result = listCursusQuerySchema.safeParse({ status: 'DRAFT' });
    expect(result.success).toBe(true);
  });

  it('accepts valid status filter ARCHIVED', () => {
    const result = listCursusQuerySchema.safeParse({ status: 'ARCHIVED' });
    expect(result.success).toBe(true);
  });

  it('accepts valid domain filter', () => {
    const result = listCursusQuerySchema.safeParse({ domain: 'ia' });
    expect(result.success).toBe(true);
    if (result.success) {expect(result.data.domain).toBe('ia');}
  });

  it('accepts valid level filter', () => {
    const result = listCursusQuerySchema.safeParse({ level: 'ADVANCED' });
    expect(result.success).toBe(true);
    if (result.success) {expect(result.data.level).toBe('ADVANCED');}
  });

  it('rejects invalid status value', () => {
    expect(listCursusQuerySchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });

  it('rejects invalid domain value', () => {
    expect(listCursusQuerySchema.safeParse({ domain: 'blockchain' }).success).toBe(false);
  });

  it('rejects invalid level value', () => {
    expect(listCursusQuerySchema.safeParse({ level: 'EXPERT' }).success).toBe(false);
  });

  it('accepts all filter fields combined', () => {
    const result = listCursusQuerySchema.safeParse({
      status: 'PUBLISHED',
      domain: 'dev-web',
      level: 'BEGINNER',
      page: 2,
      limit: 10,
    });
    expect(result.success).toBe(true);
  });
});
