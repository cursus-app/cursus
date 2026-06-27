// @vitest-environment node
//
// Tests unitaires pour server/inngest/detectProgressionAlerts.ts (ST-08.2)
//
// Stratégie : mock de prisma + logger. On teste detectAlertsForCohort directement
// (exportée pour testabilité) et on vérifie les 4 règles + l'idempotence.
//
// Scénarios couverts :
//   1. R1 — SUBMISSION_LATE : dueDate 50h passée + statut EN_COURS → alerte créée
//   2. R2 — QUIZ_REPEATEDLY_FAILED : 2 échecs sur même quiz → alerte créée
//   3. R3 — SUBMISSION_REPEATEDLY_FAILED : 5 soumissions FAILED → alerte créée
//   4. R4 — PROGRESS_STALLED : EN_COURS sans activité 7+ jours → alerte créée
//   5. Idempotence — alerte existante dans les 24h → pas de doublon
//   6. Active cohorts only — stagiaire vide → early return

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectAlertsForCohort } from '~~/server/inngest/detectProgressionAlerts';

// ─── Mocks hoistés ──────────────────────────────────────────────────────────
// vi.mock est hoisted au début du fichier — les variables utilisées dans la
// factory doivent être créées avec vi.hoisted() pour être disponibles.

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    cohorte: { findMany: vi.fn() },
    membership: { findMany: vi.fn() },
    cohortModule: { findMany: vi.fn() },
    progression: { findMany: vi.fn() },
    quizAttempt: { findMany: vi.fn() },
    submission: { findMany: vi.fn() },
    alert: { findFirst: vi.fn(), create: vi.fn() },
    notification: { create: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock('~~/server/utils/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock inngest client pour éviter les erreurs de connexion
vi.mock('~~/server/inngest/client', () => ({
  inngest: {
    createFunction: vi.fn().mockImplementation((_config: unknown, handler: unknown) => ({
      handler,
      ..._config,
    })),
  },
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const COHORTE_ID = '11111111-1111-1111-1111-111111111111';
const STAGIAIRE_ID = '22222222-2222-2222-2222-222222222222';
const FORMATEUR_ID = '33333333-3333-3333-3333-333333333333';
const MODULE_ID = '44444444-4444-4444-4444-444444444444';
const COHORT_MODULE_ID = 'cm_01jz_test_fixture_001';
const QUIZ_ID = '55555555-5555-5555-5555-555555555555';
const ALERT_ID = '66666666-6666-6666-6666-666666666666';

/** Configure membership : 1 stagiaire + 1 formateur principal. */
function setupMemberships() {
  mockPrisma.membership.findMany
    .mockResolvedValueOnce([{ userId: STAGIAIRE_ID }]) // STAGIAIRE
    .mockResolvedValueOnce([{ userId: FORMATEUR_ID }]); // FORMATEUR_PRINCIPAL
}

/** Configure cohortModule avec un module de test. */
function setupCohortModules() {
  mockPrisma.cohortModule.findMany.mockResolvedValueOnce([
    {
      id: COHORT_MODULE_ID,
      moduleId: MODULE_ID,
      module: { title: 'Module Test' },
    },
  ]);
}

/** Retourne un objet alerte créée générique. */
function makeAlertResult(kind: string, severity: string, sourceId: string) {
  return {
    id: ALERT_ID,
    userId: STAGIAIRE_ID,
    kind,
    severity,
    sourceId,
    sourceType: 'progression',
    context: {},
    createdAt: new Date(),
    resolvedAt: null,
    resolvedById: null,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('detectAlertsForCohort', () => {
  const NOW = new Date('2026-06-27T06:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    // Par défaut : pas d'alerte existante (idempotence OFF)
    mockPrisma.alert.findFirst.mockResolvedValue(null);
    mockPrisma.notification.create.mockResolvedValue({ id: 'notif-id' });
  });

  // ── Règle 1 : SUBMISSION_LATE ─────────────────────────────────────────────

  describe('R1 — SUBMISSION_LATE', () => {
    it('crée une alerte HIGH quand dueDate dépasse 48h sans soumission', async () => {
      setupMemberships();
      setupCohortModules();

      // dueDate il y a 50h → > 48h, statut EN_COURS (non soumis)
      const dueDateLate = new Date(NOW.getTime() - 50 * 60 * 60 * 1_000);

      mockPrisma.progression.findMany
        .mockResolvedValueOnce([
          { userId: STAGIAIRE_ID, cohortModuleId: COHORT_MODULE_ID, dueDate: dueDateLate },
        ]) // R1
        .mockResolvedValueOnce([]); // R4

      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([]); // R2
      mockPrisma.submission.findMany.mockResolvedValueOnce([]); // R3

      mockPrisma.alert.create.mockResolvedValue(
        makeAlertResult('SUBMISSION_LATE', 'HIGH', MODULE_ID),
      );

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(1);
      expect(mockPrisma.alert.create).toHaveBeenCalledOnce();
      expect(mockPrisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: STAGIAIRE_ID,
            kind: 'SUBMISSION_LATE',
            severity: 'HIGH',
            sourceId: MODULE_ID,
            sourceType: 'progression',
          }),
        }),
      );
    });

    it("ne crée PAS d'alerte si aucune progression en retard", async () => {
      setupMemberships();
      setupCohortModules();

      mockPrisma.progression.findMany
        .mockResolvedValueOnce([]) // R1 : rien
        .mockResolvedValueOnce([]); // R4 : rien

      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([]);
      mockPrisma.submission.findMany.mockResolvedValueOnce([]);

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(0);
      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });
  });

  // ── Règle 2 : QUIZ_REPEATEDLY_FAILED ─────────────────────────────────────

  describe('R2 — QUIZ_REPEATEDLY_FAILED', () => {
    it('crée une alerte MEDIUM quand 2+ échecs sur le même quiz', async () => {
      setupMemberships();
      setupCohortModules();

      mockPrisma.progression.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      // 2 échecs sur le même quiz → seuil atteint
      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([
        { userId: STAGIAIRE_ID, quizId: QUIZ_ID },
        { userId: STAGIAIRE_ID, quizId: QUIZ_ID },
      ]);

      mockPrisma.submission.findMany.mockResolvedValueOnce([]);

      mockPrisma.alert.create.mockResolvedValue(
        makeAlertResult('QUIZ_REPEATEDLY_FAILED', 'MEDIUM', QUIZ_ID),
      );

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(1);
      expect(mockPrisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'QUIZ_REPEATEDLY_FAILED',
            severity: 'MEDIUM',
            sourceId: QUIZ_ID,
          }),
        }),
      );
    });

    it("ne crée PAS d'alerte pour 1 seul échec quiz (< seuil 2)", async () => {
      setupMemberships();
      setupCohortModules();

      mockPrisma.progression.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([
        { userId: STAGIAIRE_ID, quizId: QUIZ_ID },
      ]);

      mockPrisma.submission.findMany.mockResolvedValueOnce([]);

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(0);
      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });

    it('ne crée PAS dalerte si 1 échec sur deux quiz différents (seuil par quiz)', async () => {
      setupMemberships();
      setupCohortModules();

      mockPrisma.progression.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const QUIZ_ID_2 = '77777777-7777-7777-7777-777777777777';
      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([
        { userId: STAGIAIRE_ID, quizId: QUIZ_ID },
        { userId: STAGIAIRE_ID, quizId: QUIZ_ID_2 },
      ]);

      mockPrisma.submission.findMany.mockResolvedValueOnce([]);

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(0);
    });
  });

  // ── Règle 3 : SUBMISSION_REPEATEDLY_FAILED ───────────────────────────────

  describe('R3 — SUBMISSION_REPEATEDLY_FAILED', () => {
    it('crée une alerte HIGH quand 5+ soumissions FAILED sur le même module', async () => {
      setupMemberships();
      setupCohortModules();

      mockPrisma.progression.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([]);

      // 5 soumissions FAILED — seuil atteint
      mockPrisma.submission.findMany.mockResolvedValueOnce(
        Array.from({ length: 5 }, () => ({ userId: STAGIAIRE_ID, moduleId: MODULE_ID })),
      );

      mockPrisma.alert.create.mockResolvedValue(
        makeAlertResult('SUBMISSION_REPEATEDLY_FAILED', 'HIGH', MODULE_ID),
      );

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(1);
      expect(mockPrisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'SUBMISSION_REPEATEDLY_FAILED',
            severity: 'HIGH',
            sourceId: MODULE_ID,
          }),
        }),
      );
    });

    it("ne crée PAS d'alerte pour 4 soumissions FAILED (< seuil 5)", async () => {
      setupMemberships();
      setupCohortModules();

      mockPrisma.progression.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([]);

      mockPrisma.submission.findMany.mockResolvedValueOnce(
        Array.from({ length: 4 }, () => ({ userId: STAGIAIRE_ID, moduleId: MODULE_ID })),
      );

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(0);
      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });
  });

  // ── Règle 4 : PROGRESS_STALLED ────────────────────────────────────────────

  describe('R4 — PROGRESS_STALLED', () => {
    it('crée une alerte LOW quand EN_COURS sans activité depuis 7+ jours', async () => {
      setupMemberships();
      setupCohortModules();

      const stalledDate = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1_000);

      mockPrisma.progression.findMany
        .mockResolvedValueOnce([]) // R1 : rien
        .mockResolvedValueOnce([
          { userId: STAGIAIRE_ID, cohortModuleId: COHORT_MODULE_ID, updatedAt: stalledDate },
        ]); // R4 : stalled

      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([]);
      mockPrisma.submission.findMany.mockResolvedValueOnce([]);

      mockPrisma.alert.create.mockResolvedValue(
        makeAlertResult('PROGRESS_STALLED', 'LOW', MODULE_ID),
      );

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(1);
      expect(mockPrisma.alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            kind: 'PROGRESS_STALLED',
            severity: 'LOW',
          }),
        }),
      );
    });
  });

  // ── Idempotence ───────────────────────────────────────────────────────────

  describe('Idempotence', () => {
    it('ne crée pas de doublon si alerte déjà ouverte dans les 24h (même userId+kind+sourceId)', async () => {
      setupMemberships();
      setupCohortModules();

      const dueDateLate = new Date(NOW.getTime() - 50 * 60 * 60 * 1_000);

      mockPrisma.progression.findMany
        .mockResolvedValueOnce([
          { userId: STAGIAIRE_ID, cohortModuleId: COHORT_MODULE_ID, dueDate: dueDateLate },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([]);
      mockPrisma.submission.findMany.mockResolvedValueOnce([]);

      // Alerte existante créée il y a 2h (dans les 24h) — idempotence : skip
      mockPrisma.alert.findFirst.mockResolvedValue({
        id: ALERT_ID,
        userId: STAGIAIRE_ID,
        kind: 'SUBMISSION_LATE',
        sourceId: MODULE_ID,
        resolvedAt: null,
        createdAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1_000),
      });

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(0);
      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
    });

    it('crée une nouvelle alerte si aucun doublon dans les 24h (idempotence OK)', async () => {
      setupMemberships();
      setupCohortModules();

      const dueDateLate = new Date(NOW.getTime() - 50 * 60 * 60 * 1_000);

      mockPrisma.progression.findMany
        .mockResolvedValueOnce([
          { userId: STAGIAIRE_ID, cohortModuleId: COHORT_MODULE_ID, dueDate: dueDateLate },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([]);
      mockPrisma.submission.findMany.mockResolvedValueOnce([]);

      // Pas d'alerte existante → création autorisée
      mockPrisma.alert.findFirst.mockResolvedValue(null);
      mockPrisma.alert.create.mockResolvedValue(
        makeAlertResult('SUBMISSION_LATE', 'HIGH', MODULE_ID),
      );

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(1);
      expect(mockPrisma.alert.create).toHaveBeenCalledOnce();
    });

    it('crée 2 alertes si 2 conditions distinctes (kinds différents) sans doublon', async () => {
      setupMemberships();
      setupCohortModules();

      const dueDateLate = new Date(NOW.getTime() - 50 * 60 * 60 * 1_000);

      // R1 : 1 progression en retard
      mockPrisma.progression.findMany
        .mockResolvedValueOnce([
          { userId: STAGIAIRE_ID, cohortModuleId: COHORT_MODULE_ID, dueDate: dueDateLate },
        ])
        .mockResolvedValueOnce([]);

      // R2 : 2 échecs quiz
      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([
        { userId: STAGIAIRE_ID, quizId: QUIZ_ID },
        { userId: STAGIAIRE_ID, quizId: QUIZ_ID },
      ]);

      mockPrisma.submission.findMany.mockResolvedValueOnce([]);

      // Aucun doublon existant
      mockPrisma.alert.findFirst.mockResolvedValue(null);
      mockPrisma.alert.create
        .mockResolvedValueOnce(makeAlertResult('SUBMISSION_LATE', 'HIGH', MODULE_ID))
        .mockResolvedValueOnce(makeAlertResult('QUIZ_REPEATEDLY_FAILED', 'MEDIUM', QUIZ_ID));

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(2);
      expect(mockPrisma.alert.create).toHaveBeenCalledTimes(2);
    });
  });

  // ── Active cohorts only (edge case) ──────────────────────────────────────

  describe('Active cohorts only — cohorte sans stagiaires', () => {
    it('retourne 0 immédiatement si la cohorte na aucun stagiaire (early return)', async () => {
      // STAGIAIRE : tableau vide — simule cohorte sans membres actifs
      mockPrisma.membership.findMany
        .mockResolvedValueOnce([]) // STAGIAIRE
        .mockResolvedValueOnce([{ userId: FORMATEUR_ID }]); // FORMATEUR_PRINCIPAL

      // cohortModule.findMany ne devrait pas être appelé (early return)
      // Mais avec notre Promise.all, il sera appelé en même temps que membership.findMany
      mockPrisma.cohortModule.findMany.mockResolvedValueOnce([
        { id: COHORT_MODULE_ID, moduleId: MODULE_ID, module: { title: 'Module Test' } },
      ]);

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(0);
      // Aucune alerte ni notification créée
      expect(mockPrisma.alert.create).not.toHaveBeenCalled();
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  // ── Notifications formateur ───────────────────────────────────────────────

  describe('Notifications', () => {
    it('crée une notification ALERT_RAISED pour le formateur principal lors dune alerte', async () => {
      setupMemberships();
      setupCohortModules();

      const dueDateLate = new Date(NOW.getTime() - 50 * 60 * 60 * 1_000);

      mockPrisma.progression.findMany
        .mockResolvedValueOnce([
          { userId: STAGIAIRE_ID, cohortModuleId: COHORT_MODULE_ID, dueDate: dueDateLate },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([]);
      mockPrisma.submission.findMany.mockResolvedValueOnce([]);

      mockPrisma.alert.create.mockResolvedValue(
        makeAlertResult('SUBMISSION_LATE', 'HIGH', MODULE_ID),
      );

      await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(mockPrisma.notification.create).toHaveBeenCalledOnce();
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: FORMATEUR_ID,
            type: 'ALERT_RAISED',
          }),
        }),
      );
    });

    it("ne crée PAS de notification si aucune alerte n'est déclenchée", async () => {
      setupMemberships();
      setupCohortModules();

      mockPrisma.progression.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      mockPrisma.quizAttempt.findMany.mockResolvedValueOnce([]);
      mockPrisma.submission.findMany.mockResolvedValueOnce([]);

      const count = await detectAlertsForCohort(COHORTE_ID, NOW);

      expect(count).toBe(0);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
