// Tests unitaires pour les utilitaires heatmap (ST-13.2).
// Importe depuis app/utils/heatmap.ts (fonctions pures, testables sans runtime Nuxt).
// Cf. ST-13.2 — TT-13.2.2 (grille heatmap) + tests CSV export.

import { describe, it, expect } from 'vitest';

import {
  generateCsvContent,
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_PATTERNS,
  ALERT_STATUSES,
  LATE_STATUSES,
  VALIDATED_STATUSES,
  SUBMITTED_STATUSES,
} from '~~/app/utils/heatmap';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TRAINEES = [
  { id: 'u1', fullName: 'Alice Dupont', avatarUrl: null, githubHandle: 'alice' },
  { id: 'u2', fullName: 'Bob Martin', avatarUrl: null, githubHandle: 'bob' },
  { id: 'u3', fullName: null, avatarUrl: null, githubHandle: 'charlie' },
];

const MODULES = [
  {
    id: 'cm1',
    moduleId: 'mod1',
    position: 0,
    dueDate: '2026-06-01T00:00:00.000Z',
    title: 'HTML/CSS',
    week: 1,
  },
  {
    id: 'cm2',
    moduleId: 'mod2',
    position: 1,
    dueDate: '2026-06-08T00:00:00.000Z',
    title: 'JavaScript',
    week: 2,
  },
];

const HEATMAP = [
  { userId: 'u1', cohortModuleId: 'cm1', status: 'VALIDE' as const, hasAlert: false },
  { userId: 'u1', cohortModuleId: 'cm2', status: 'EN_COURS' as const, hasAlert: false },
  { userId: 'u2', cohortModuleId: 'cm1', status: 'A_VENIR' as const, hasAlert: true },
  { userId: 'u2', cohortModuleId: 'cm2', status: 'EN_RETARD' as const, hasAlert: false },
  { userId: 'u3', cohortModuleId: 'cm1', status: 'SOUMIS' as const, hasAlert: false },
  { userId: 'u3', cohortModuleId: 'cm2', status: 'BLOQUE' as const, hasAlert: true },
];

// ─── Tests — generateCsvContent ───────────────────────────────────────────────

describe('generateCsvContent — export CSV', () => {
  it('génère un header CSV correct', () => {
    const csv = generateCsvContent(TRAINEES, MODULES, HEATMAP);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('stagiaire,module,semaine,statut,date_limite');
  });

  it('génère le bon nombre de lignes (header + stagiaires × modules)', () => {
    const csv = generateCsvContent(TRAINEES, MODULES, HEATMAP);
    const lines = csv.split('\n').filter(Boolean);
    // 1 header + 3 stagiaires × 2 modules = 7 lignes
    expect(lines).toHaveLength(7);
  });

  it('inclut les statuts corrects dans le CSV', () => {
    const csv = generateCsvContent(TRAINEES, MODULES, HEATMAP);
    expect(csv).toContain('VALIDE');
    expect(csv).toContain('EN_COURS');
    expect(csv).toContain('A_VENIR');
    expect(csv).toContain('EN_RETARD');
    expect(csv).toContain('SOUMIS');
    expect(csv).toContain('BLOQUE');
  });

  it('utilise le githubHandle si fullName est null', () => {
    const csv = generateCsvContent(TRAINEES, MODULES, HEATMAP);
    expect(csv).toContain('charlie');
  });

  it('échappe les virgules dans les noms de stagiaires', () => {
    const traineeWithComma = [
      { id: 'u99', fullName: 'Nom, Prénom', avatarUrl: null, githubHandle: 'test' },
    ];
    const moduleFirst = MODULES[0];
    if (!moduleFirst) {
      throw new Error('fixture missing');
    }
    const csv = generateCsvContent(
      traineeWithComma,
      [moduleFirst],
      [{ userId: 'u99', cohortModuleId: 'cm1', status: 'VALIDE' as const, hasAlert: false }],
    );
    // Le nom avec virgule doit être entre guillemets
    expect(csv).toContain('"Nom, Prénom"');
  });

  it('échappe les guillemets dans les valeurs CSV', () => {
    const moduleWithQuote = [
      {
        id: 'cm99',
        moduleId: 'mod99',
        position: 0,
        dueDate: '2026-06-01T00:00:00.000Z',
        title: 'Module "Avancé"',
        week: 5,
      },
    ];
    const traineeFirst = TRAINEES[0];
    if (!traineeFirst) {
      throw new Error('fixture missing');
    }
    const csv = generateCsvContent([traineeFirst], moduleWithQuote, [
      { userId: 'u1', cohortModuleId: 'cm99', status: 'VALIDE' as const, hasAlert: false },
    ]);
    // Le titre avec guillemets doit être entouré de guillemets + guillemets doublés
    expect(csv).toContain('"Module ""Avancé"""');
  });

  it("attribue le statut A_VENIR si la cellule n'existe pas dans la heatmap", () => {
    const sparseHeatmap = [
      { userId: 'u1', cohortModuleId: 'cm1', status: 'VALIDE' as const, hasAlert: false },
    ];
    const traineeFirst = TRAINEES[0];
    if (!traineeFirst) {
      throw new Error('fixture missing');
    }
    const csv = generateCsvContent([traineeFirst], MODULES, sparseHeatmap);
    // cm2 n'est pas dans la heatmap pour u1 → A_VENIR
    expect(csv).toContain('A_VENIR');
  });

  it('produit un CSV vide (seulement header) pour un tableau de stagiaires vide', () => {
    const csv = generateCsvContent([], MODULES, []);
    const lines = csv.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    const firstLine = lines[0];
    if (!firstLine) {
      throw new Error('No lines');
    }
    expect(firstLine).toContain('stagiaire');
  });

  it('produit un CSV vide (seulement header) pour un tableau de modules vide', () => {
    const csv = generateCsvContent(TRAINEES, [], []);
    const lines = csv.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
  });

  it('inclut la date limite correctement formatée (ISO 10 chars)', () => {
    const traineeFirst = TRAINEES[0];
    const moduleFirst = MODULES[0];
    const heatmapFirst = HEATMAP[0];
    if (!traineeFirst || !moduleFirst || !heatmapFirst) {
      throw new Error('fixture missing');
    }
    const csv = generateCsvContent([traineeFirst], [moduleFirst], [heatmapFirst]);
    expect(csv).toContain('2026-06-01');
  });

  it("utilise l'id comme nom de stagiaire si fullName et githubHandle sont null", () => {
    const traineeWithNoName = [
      { id: 'u-ghost', fullName: null, avatarUrl: null, githubHandle: null },
    ];
    const moduleFirst = MODULES[0];
    if (!moduleFirst) {
      throw new Error('fixture missing');
    }
    const csv = generateCsvContent(traineeWithNoName, [moduleFirst], []);
    expect(csv).toContain('u-ghost');
  });
});

// ─── Tests — STATUS_COLORS ────────────────────────────────────────────────────

describe('STATUS_COLORS — mapping statut → classes CSS', () => {
  const ALL_STATUSES = [
    'A_VENIR',
    'EN_COURS',
    'SOUMIS',
    'VALIDE',
    'BLOQUE',
    'EN_ALERTE',
    'EN_RETARD',
    'VALIDE_OVERRIDE',
  ];

  it('contient une entrée pour chaque valeur de ProgressionStatus', () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_COLORS).toHaveProperty(status);
      expect(typeof STATUS_COLORS[status as keyof typeof STATUS_COLORS]).toBe('string');
    }
  });

  it('utilise uniquement des tokens de design system (pas de primitifs Tailwind)', () => {
    const allClasses = Object.values(STATUS_COLORS).join(' ');
    // Ne doit pas contenir de primitifs comme bg-green-500, text-red-600, etc.
    expect(allClasses).not.toMatch(
      /(?:bg|text|border)-(?:green|red|orange|yellow|blue|purple|gray|zinc|slate|neutral)-\d{3}/,
    );
  });

  it("n'utilise pas de couleurs en dur (#xxx, rgb(), oklch())", () => {
    const allClasses = Object.values(STATUS_COLORS).join(' ');
    expect(allClasses).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    expect(allClasses).not.toMatch(/rgb\(/);
    expect(allClasses).not.toMatch(/oklch\(/);
  });

  it('VALIDE utilise bg-success-bg', () => {
    expect(STATUS_COLORS['VALIDE']).toContain('bg-success-bg');
  });

  it('VALIDE_OVERRIDE utilise bg-success-bg', () => {
    expect(STATUS_COLORS['VALIDE_OVERRIDE']).toContain('bg-success-bg');
  });

  it('EN_ALERTE utilise bg-warning-bg', () => {
    expect(STATUS_COLORS['EN_ALERTE']).toContain('bg-warning-bg');
  });

  it('EN_RETARD utilise bg-danger-bg', () => {
    expect(STATUS_COLORS['EN_RETARD']).toContain('bg-danger-bg');
  });

  it('BLOQUE utilise bg-danger-bg', () => {
    expect(STATUS_COLORS['BLOQUE']).toContain('bg-danger-bg');
  });

  it('A_VENIR utilise bg-muted', () => {
    expect(STATUS_COLORS['A_VENIR']).toContain('bg-muted');
  });

  it('EN_COURS utilise bg-accent', () => {
    expect(STATUS_COLORS['EN_COURS']).toContain('bg-accent');
  });
});

// ─── Tests — STATUS_ICONS ─────────────────────────────────────────────────────

describe('STATUS_ICONS — icônes Tabler par statut', () => {
  it('toutes les icônes ont le préfixe i-tabler-', () => {
    for (const icon of Object.values(STATUS_ICONS)) {
      expect(icon).toMatch(/^i-tabler-/);
    }
  });

  it('contient une icône pour chaque statut ProgressionStatus', () => {
    const expectedStatuses = [
      'A_VENIR',
      'EN_COURS',
      'SOUMIS',
      'VALIDE',
      'BLOQUE',
      'EN_ALERTE',
      'EN_RETARD',
      'VALIDE_OVERRIDE',
    ];
    for (const status of expectedStatuses) {
      expect(STATUS_ICONS).toHaveProperty(status);
    }
  });
});

// ─── Tests — STATUS_PATTERNS ──────────────────────────────────────────────────

describe('STATUS_PATTERNS — motifs accessibilité daltoniens', () => {
  it('contient un motif (même vide) pour chaque statut', () => {
    const expectedStatuses = [
      'A_VENIR',
      'EN_COURS',
      'SOUMIS',
      'VALIDE',
      'BLOQUE',
      'EN_ALERTE',
      'EN_RETARD',
      'VALIDE_OVERRIDE',
    ];
    for (const status of expectedStatuses) {
      expect(STATUS_PATTERNS).toHaveProperty(status);
      expect(typeof STATUS_PATTERNS[status as keyof typeof STATUS_PATTERNS]).toBe('string');
    }
  });

  it('A_VENIR a un motif vide (pas de pattern sur le statut neutre)', () => {
    expect(STATUS_PATTERNS['A_VENIR']).toBe('');
  });
});

// ─── Tests — Constantes de statuts groupés ────────────────────────────────────

describe('Constantes de groupes de statuts', () => {
  it('LATE_STATUSES contient EN_RETARD et BLOQUE', () => {
    expect(LATE_STATUSES).toContain('EN_RETARD');
    expect(LATE_STATUSES).toContain('BLOQUE');
  });

  it('ALERT_STATUSES inclut EN_ALERTE et les statuts retard', () => {
    expect(ALERT_STATUSES).toContain('EN_ALERTE');
    expect(ALERT_STATUSES).toContain('EN_RETARD');
    expect(ALERT_STATUSES).toContain('BLOQUE');
  });

  it('VALIDATED_STATUSES contient VALIDE et VALIDE_OVERRIDE', () => {
    expect(VALIDATED_STATUSES).toContain('VALIDE');
    expect(VALIDATED_STATUSES).toContain('VALIDE_OVERRIDE');
  });

  it('SUBMITTED_STATUSES inclut SOUMIS et les statuts validés', () => {
    expect(SUBMITTED_STATUSES).toContain('SOUMIS');
    expect(SUBMITTED_STATUSES).toContain('VALIDE');
    expect(SUBMITTED_STATUSES).toContain('VALIDE_OVERRIDE');
  });
});
