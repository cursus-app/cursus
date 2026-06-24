/**
 * Tests unitaires du composable usePermission.
 *
 * Stratégie : on mock useUserStore() pour contrôler l'état RBAC
 * et on vérifie que chaque helper retourne la bonne valeur pour chaque rôle.
 *
 * Ces tests couvrent en priorité les cas négatifs (un STAGIAIRE NE PEUT PAS faire X)
 * qui sont exigés par la Definition of Done (≥20 tests négatifs).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import type { UserMembership } from '~/stores/user';

// État mutable du store — réinitialisé dans beforeEach.
let mockGlobalRole: string | null = null;
let mockMemberships: UserMembership[] = [];

mockNuxtImport('useUserStore', () => () => ({
  get globalRole() {
    return mockGlobalRole;
  },
  get memberships() {
    return mockMemberships;
  },
}));

// Helpers pour construire des états RBAC courants.
const COHORTE_A = 'cohorte-a-uuid';
const COHORTE_B = 'cohorte-b-uuid';

function memberOf(cohorteId: string, role: UserMembership['role']): UserMembership {
  return { cohorteId, role, cohorte: { id: cohorteId, name: 'Test Cohorte' } };
}

// ─── isAdmin ─────────────────────────────────────────────────────────────────

describe('usePermission — isAdmin()', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true for ADMIN global role', async () => {
    mockGlobalRole = 'ADMIN';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isAdmin()).toBe(true);
  });

  it('returns false for STAGIAIRE', async () => {
    mockGlobalRole = 'STAGIAIRE';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isAdmin()).toBe(false);
  });

  it('returns false for FORMATEUR_PRINCIPAL', async () => {
    mockGlobalRole = 'FORMATEUR_PRINCIPAL';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isAdmin()).toBe(false);
  });

  it('returns false for CO_FORMATEUR', async () => {
    mockGlobalRole = 'CO_FORMATEUR';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isAdmin()).toBe(false);
  });

  it('returns false when no role (null)', async () => {
    mockGlobalRole = null;
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isAdmin()).toBe(false);
  });
});

// ─── isFormateur ──────────────────────────────────────────────────────────────

describe('usePermission — isFormateur()', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true for FORMATEUR_PRINCIPAL global role', async () => {
    mockGlobalRole = 'FORMATEUR_PRINCIPAL';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateur()).toBe(true);
  });

  it('returns true for CO_FORMATEUR global role', async () => {
    mockGlobalRole = 'CO_FORMATEUR';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateur()).toBe(true);
  });

  it('returns true when membership role is FORMATEUR_PRINCIPAL (no global role)', async () => {
    mockGlobalRole = null;
    mockMemberships = [memberOf(COHORTE_A, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateur()).toBe(true);
  });

  it('returns true when membership role is CO_FORMATEUR (no global role)', async () => {
    mockGlobalRole = null;
    mockMemberships = [memberOf(COHORTE_A, 'CO_FORMATEUR')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateur()).toBe(true);
  });

  // Cas négatifs
  it('returns false for STAGIAIRE with no formateur membership', async () => {
    mockGlobalRole = 'STAGIAIRE';
    mockMemberships = [memberOf(COHORTE_A, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateur()).toBe(false);
  });

  it('returns false when no role and no memberships', async () => {
    mockGlobalRole = null;
    mockMemberships = [];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateur()).toBe(false);
  });
});

// ─── isFormateurPrincipal ─────────────────────────────────────────────────────

describe('usePermission — isFormateurPrincipal()', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true for ADMIN (admin implique formateur principal partout)', async () => {
    mockGlobalRole = 'ADMIN';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateurPrincipal()).toBe(true);
    expect(usePermission().isFormateurPrincipal(COHORTE_A)).toBe(true);
  });

  it('returns true when membership role is FORMATEUR_PRINCIPAL for the given cohorte', async () => {
    mockGlobalRole = null;
    mockMemberships = [memberOf(COHORTE_A, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateurPrincipal(COHORTE_A)).toBe(true);
  });

  // Cas négatifs
  it('returns false for CO_FORMATEUR in the same cohorte', async () => {
    mockGlobalRole = null;
    mockMemberships = [memberOf(COHORTE_A, 'CO_FORMATEUR')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateurPrincipal(COHORTE_A)).toBe(false);
  });

  it('returns false when FORMATEUR_PRINCIPAL in cohorte B but querying cohorte A', async () => {
    mockGlobalRole = null;
    mockMemberships = [memberOf(COHORTE_B, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateurPrincipal(COHORTE_A)).toBe(false);
  });

  it('returns false for STAGIAIRE in the cohorte', async () => {
    mockGlobalRole = null;
    mockMemberships = [memberOf(COHORTE_A, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateurPrincipal(COHORTE_A)).toBe(false);
  });
});

// ─── isStagiaire ──────────────────────────────────────────────────────────────

describe('usePermission — isStagiaire()', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true when membership role is STAGIAIRE in the given cohorte', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isStagiaire(COHORTE_A)).toBe(true);
  });

  // Cas négatifs
  it('returns false for STAGIAIRE in cohorte B when querying cohorte A', async () => {
    mockMemberships = [memberOf(COHORTE_B, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isStagiaire(COHORTE_A)).toBe(false);
  });

  it('returns false for FORMATEUR_PRINCIPAL in the cohorte', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isStagiaire(COHORTE_A)).toBe(false);
  });

  it('returns false with no memberships', async () => {
    mockMemberships = [];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isStagiaire(COHORTE_A)).toBe(false);
  });
});

// ─── canManageCursus ──────────────────────────────────────────────────────────

describe('usePermission — canManageCursus()', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true for ADMIN', async () => {
    mockGlobalRole = 'ADMIN';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canManageCursus()).toBe(true);
  });

  it('returns true for FORMATEUR_PRINCIPAL', async () => {
    mockGlobalRole = 'FORMATEUR_PRINCIPAL';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canManageCursus()).toBe(true);
  });

  it('returns true for CO_FORMATEUR', async () => {
    mockGlobalRole = 'CO_FORMATEUR';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canManageCursus()).toBe(true);
  });

  // Cas négatifs
  it('returns false for STAGIAIRE', async () => {
    mockGlobalRole = 'STAGIAIRE';
    mockMemberships = [memberOf(COHORTE_A, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canManageCursus()).toBe(false);
  });

  it('returns false with no role and no memberships', async () => {
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canManageCursus()).toBe(false);
  });
});

// ─── canManageCohorte ─────────────────────────────────────────────────────────

describe('usePermission — canManageCohorte()', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true for ADMIN without cohorteId', async () => {
    mockGlobalRole = 'ADMIN';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canManageCohorte()).toBe(true);
  });

  it('returns true for FORMATEUR_PRINCIPAL of the cohorte', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canManageCohorte(COHORTE_A)).toBe(true);
  });

  // Cas négatifs
  it('returns false for CO_FORMATEUR in the cohorte', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'CO_FORMATEUR')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canManageCohorte(COHORTE_A)).toBe(false);
  });

  it('returns false for STAGIAIRE', async () => {
    mockGlobalRole = 'STAGIAIRE';
    mockMemberships = [memberOf(COHORTE_A, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canManageCohorte(COHORTE_A)).toBe(false);
  });

  it('returns false for FORMATEUR_PRINCIPAL in cohorte B when managing cohorte A', async () => {
    mockMemberships = [memberOf(COHORTE_B, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canManageCohorte(COHORTE_A)).toBe(false);
  });
});

// ─── canViewSubmissions ───────────────────────────────────────────────────────

describe('usePermission — canViewSubmissions()', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true for ADMIN', async () => {
    mockGlobalRole = 'ADMIN';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canViewSubmissions(COHORTE_A)).toBe(true);
  });

  it('returns true for FORMATEUR_PRINCIPAL of the cohorte', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canViewSubmissions(COHORTE_A)).toBe(true);
  });

  it('returns true for CO_FORMATEUR of the cohorte', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'CO_FORMATEUR')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canViewSubmissions(COHORTE_A)).toBe(true);
  });

  it('returns true for STAGIAIRE in the same cohorte', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canViewSubmissions(COHORTE_A)).toBe(true);
  });

  // Cas négatifs
  it('returns false for STAGIAIRE in cohorte B when querying cohorte A', async () => {
    mockMemberships = [memberOf(COHORTE_B, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canViewSubmissions(COHORTE_A)).toBe(false);
  });

  it('returns false with no role and no memberships', async () => {
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canViewSubmissions(COHORTE_A)).toBe(false);
  });
});

// ─── canOverrideSubmission ────────────────────────────────────────────────────

describe('usePermission — canOverrideSubmission()', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true for ADMIN', async () => {
    mockGlobalRole = 'ADMIN';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canOverrideSubmission(COHORTE_A)).toBe(true);
  });

  it('returns true for FORMATEUR_PRINCIPAL of the cohorte', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canOverrideSubmission(COHORTE_A)).toBe(true);
  });

  // Cas négatifs
  it('returns false for CO_FORMATEUR', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'CO_FORMATEUR')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canOverrideSubmission(COHORTE_A)).toBe(false);
  });

  it('returns false for STAGIAIRE', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canOverrideSubmission(COHORTE_A)).toBe(false);
  });

  it('returns false for FORMATEUR_PRINCIPAL in cohorte B overriding submission in cohorte A', async () => {
    mockMemberships = [memberOf(COHORTE_B, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canOverrideSubmission(COHORTE_A)).toBe(false);
  });
});

// ─── canSeeAlert ─────────────────────────────────────────────────────────────

describe('usePermission — canSeeAlert()', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true for ADMIN', async () => {
    mockGlobalRole = 'ADMIN';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canSeeAlert()).toBe(true);
  });

  it('returns true for FORMATEUR_PRINCIPAL of the cohorte', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canSeeAlert(COHORTE_A)).toBe(true);
  });

  // Cas négatifs
  it('returns false for CO_FORMATEUR', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'CO_FORMATEUR')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canSeeAlert(COHORTE_A)).toBe(false);
  });

  it('returns false for STAGIAIRE', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canSeeAlert(COHORTE_A)).toBe(false);
  });
});

// ─── canEditCursus ────────────────────────────────────────────────────────────

describe('usePermission — canEditCursus()', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true for ADMIN', async () => {
    mockGlobalRole = 'ADMIN';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canEditCursus()).toBe(true);
  });

  it('returns true for FORMATEUR_PRINCIPAL via global role', async () => {
    mockGlobalRole = 'FORMATEUR_PRINCIPAL';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canEditCursus()).toBe(true);
  });

  it('returns true for CO_FORMATEUR via membership', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'CO_FORMATEUR')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canEditCursus()).toBe(true);
  });

  // Cas négatif
  it('returns false for STAGIAIRE', async () => {
    mockGlobalRole = null;
    mockMemberships = [memberOf(COHORTE_A, 'STAGIAIRE')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().canEditCursus()).toBe(false);
  });
});

// ─── isFormateurPrincipal sans cohorteId ─────────────────────────────────────

describe('usePermission — isFormateurPrincipal() sans cohorteId', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('returns true when FORMATEUR_PRINCIPAL global role (sans cohorteId)', async () => {
    mockGlobalRole = 'FORMATEUR_PRINCIPAL';
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateurPrincipal()).toBe(true);
  });

  it('returns true when membership has FORMATEUR_PRINCIPAL (sans cohorteId)', async () => {
    mockGlobalRole = null;
    mockMemberships = [memberOf(COHORTE_B, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateurPrincipal()).toBe(true);
  });

  it('returns false when only CO_FORMATEUR memberships (sans cohorteId)', async () => {
    mockGlobalRole = null;
    mockMemberships = [memberOf(COHORTE_A, 'CO_FORMATEUR')];
    const { usePermission } = await import('~/composables/usePermission');
    expect(usePermission().isFormateurPrincipal()).toBe(false);
  });
});

// ─── Multi-cohorte user ───────────────────────────────────────────────────────

describe('usePermission — utilisateur multi-cohortes', () => {
  beforeEach(() => {
    mockGlobalRole = null;
    mockMemberships = [];
  });

  it('can be STAGIAIRE in cohorte A and CO_FORMATEUR in cohorte B simultaneously', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'STAGIAIRE'), memberOf(COHORTE_B, 'CO_FORMATEUR')];
    const { usePermission } = await import('~/composables/usePermission');
    const perms = usePermission();

    expect(perms.isStagiaire(COHORTE_A)).toBe(true);
    expect(perms.isStagiaire(COHORTE_B)).toBe(false);
    expect(perms.canViewSubmissions(COHORTE_A)).toBe(true);
    expect(perms.canViewSubmissions(COHORTE_B)).toBe(true);
    // Ne peut PAS gérer cohorte A (stagiaire) mais peut voir ses submissions.
    expect(perms.canManageCohorte(COHORTE_A)).toBe(false);
    // Ne peut PAS overrider (co-formateur, pas formateur principal).
    expect(perms.canOverrideSubmission(COHORTE_B)).toBe(false);
  });

  it('FORMATEUR_PRINCIPAL in cohorte A does not grant rights on cohorte B', async () => {
    mockMemberships = [memberOf(COHORTE_A, 'FORMATEUR_PRINCIPAL')];
    const { usePermission } = await import('~/composables/usePermission');
    const perms = usePermission();

    expect(perms.canManageCohorte(COHORTE_A)).toBe(true);
    expect(perms.canManageCohorte(COHORTE_B)).toBe(false);
    expect(perms.canOverrideSubmission(COHORTE_A)).toBe(true);
    expect(perms.canOverrideSubmission(COHORTE_B)).toBe(false);
  });
});
