// @vitest-environment happy-dom
//
// Tests unitaires pour les schémas Zod de la feature cohorte (ST-04.1, ST-04.3).
// Valide la symétrie client/serveur des règles de validation.

import { describe, expect, it } from 'vitest';
import {
  cohorteCreateSchema,
  cohorteUpdateSchema,
  listCohortesQuerySchema,
  coFormateurAddSchema,
  coFormateurUpdateSchema,
} from '~~/shared/schemas/cohorte';

const VALID_CREATE = {
  name: 'Promo Automne 2026',
  cursusId: '123e4567-e89b-12d3-a456-426614174000',
  startDate: '2026-09-01',
  endDate: '2026-12-31',
  rhythm: 'WEEKLY' as const,
};

describe('cohorteCreateSchema', () => {
  it('accepts a valid payload', () => {
    const result = cohorteCreateSchema.safeParse(VALID_CREATE);
    expect(result.success).toBe(true);
  });

  it('defaults rhythm to WEEKLY when omitted', () => {
    const { rhythm: _r, ...withoutRhythm } = VALID_CREATE;
    const result = cohorteCreateSchema.safeParse(withoutRhythm);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rhythm).toBe('WEEKLY');
    }
  });

  it('rejects name shorter than 2 characters', () => {
    const result = cohorteCreateSchema.safeParse({ ...VALID_CREATE, name: 'X' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('cohortes.errors.nameTooShort');
    }
  });

  it('rejects name longer than 100 characters', () => {
    const result = cohorteCreateSchema.safeParse({ ...VALID_CREATE, name: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid cursusId (not a UUID)', () => {
    const result = cohorteCreateSchema.safeParse({ ...VALID_CREATE, cursusId: 'not-a-uuid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('cohortes.errors.cursusIdInvalid');
    }
  });

  it('rejects endDate before startDate', () => {
    const result = cohorteCreateSchema.safeParse({
      ...VALID_CREATE,
      startDate: '2026-12-31',
      endDate: '2026-09-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('cohortes.errors.endDateBeforeStart');
    }
  });

  it('rejects endDate equal to startDate', () => {
    const result = cohorteCreateSchema.safeParse({
      ...VALID_CREATE,
      startDate: '2026-09-01',
      endDate: '2026-09-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid startDate format', () => {
    const result = cohorteCreateSchema.safeParse({ ...VALID_CREATE, startDate: '01/09/2026' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('cohortes.errors.startDateInvalid');
    }
  });

  it('rejects invalid endDate format', () => {
    const result = cohorteCreateSchema.safeParse({ ...VALID_CREATE, endDate: 'not-a-date' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('cohortes.errors.endDateInvalid');
    }
  });
});

describe('cohorteUpdateSchema', () => {
  it('accepts an empty payload (all fields optional)', () => {
    const result = cohorteUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a partial name-only update', () => {
    const result = cohorteUpdateSchema.safeParse({ name: 'Nouvelle promo' });
    expect(result.success).toBe(true);
  });

  it('accepts valid dates when both provided', () => {
    const result = cohorteUpdateSchema.safeParse({
      startDate: '2026-09-01',
      endDate: '2026-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('rejects endDate before startDate when both provided', () => {
    const result = cohorteUpdateSchema.safeParse({
      startDate: '2026-12-31',
      endDate: '2026-09-01',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('cohortes.errors.endDateBeforeStart');
    }
  });

  it('passes when only startDate is provided (no cross-field check)', () => {
    const result = cohorteUpdateSchema.safeParse({ startDate: '2026-09-01' });
    expect(result.success).toBe(true);
  });

  it('passes when only endDate is provided (no cross-field check)', () => {
    const result = cohorteUpdateSchema.safeParse({ endDate: '2026-12-31' });
    expect(result.success).toBe(true);
  });

  it('does not accept cursusId (field is omitted from update schema)', () => {
    const result = cohorteUpdateSchema.safeParse({
      cursusId: '123e4567-e89b-12d3-a456-426614174000',
    });
    // Zod strips unknown keys — safeParse succeeds but cursusId is stripped
    expect(result.success).toBe(true);
    if (result.success) {
      // @ts-expect-error — cursusId should not exist in the output type
      expect(result.data.cursusId).toBeUndefined();
    }
  });
});

describe('listCohortesQuerySchema', () => {
  it('defaults page to 1 and limit to 20', () => {
    const result = listCohortesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string page and limit to numbers', () => {
    const result = listCohortesQuerySchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('accepts a valid status filter', () => {
    const result = listCohortesQuerySchema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status value', () => {
    const result = listCohortesQuerySchema.safeParse({ status: 'UNKNOWN' });
    expect(result.success).toBe(false);
  });

  it('rejects limit greater than 100', () => {
    const result = listCohortesQuerySchema.safeParse({ limit: '200' });
    expect(result.success).toBe(false);
  });
});

// ─── coFormateurAddSchema (ST-04.3) ───────────────────────────────────────────

describe('coFormateurAddSchema', () => {
  const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

  it('accepts email with null moduleIds (global)', () => {
    const result = coFormateurAddSchema.safeParse({ email: 'test@example.fr', moduleIds: null });
    expect(result.success).toBe(true);
  });

  it('accepts userId with moduleIds array', () => {
    const result = coFormateurAddSchema.safeParse({ userId: VALID_UUID, moduleIds: [VALID_UUID] });
    expect(result.success).toBe(true);
  });

  it('accepts email only (no moduleIds → undefined)', () => {
    const result = coFormateurAddSchema.safeParse({ email: 'test@example.fr' });
    expect(result.success).toBe(true);
  });

  it('rejects when neither email nor userId is provided', () => {
    const result = coFormateurAddSchema.safeParse({ moduleIds: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('cohortes.errors.emailOrUserIdRequired');
    }
  });

  it('rejects invalid email format', () => {
    const result = coFormateurAddSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid userId (not a UUID)', () => {
    const result = coFormateurAddSchema.safeParse({ userId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects moduleIds containing invalid UUIDs', () => {
    const result = coFormateurAddSchema.safeParse({
      email: 'test@example.fr',
      moduleIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty moduleIds array', () => {
    const result = coFormateurAddSchema.safeParse({ email: 'test@example.fr', moduleIds: [] });
    expect(result.success).toBe(true);
  });
});

// ─── coFormateurUpdateSchema (ST-04.3) ────────────────────────────────────────

describe('coFormateurUpdateSchema', () => {
  const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

  it('accepts null (global access)', () => {
    const result = coFormateurUpdateSchema.safeParse({ moduleIds: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moduleIds).toBeNull();
    }
  });

  it('accepts empty array (no modules)', () => {
    const result = coFormateurUpdateSchema.safeParse({ moduleIds: [] });
    expect(result.success).toBe(true);
  });

  it('accepts array of valid UUIDs', () => {
    const result = coFormateurUpdateSchema.safeParse({ moduleIds: [VALID_UUID] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.moduleIds).toEqual([VALID_UUID]);
    }
  });

  it('rejects missing moduleIds field', () => {
    const result = coFormateurUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects moduleIds containing non-UUID values', () => {
    const result = coFormateurUpdateSchema.safeParse({ moduleIds: ['invalid-id'] });
    expect(result.success).toBe(false);
  });
});
