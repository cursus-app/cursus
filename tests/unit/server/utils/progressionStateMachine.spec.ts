// @vitest-environment node
//
// Tests unitaires — progressionStateMachine.ts (ST-08.1)
// Couvre : matrice de transitions, états terminaux, race condition, helpers.

import { describe, it, expect, vi } from 'vitest';
import type { ProgressionStatus } from '@prisma/client';
import {
  VALID_TRANSITIONS,
  InvalidTransitionError,
  transition,
  isTerminal,
  availableTransitions,
} from '~~/server/utils/progressionStateMachine';

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePrisma(currentStatus: ProgressionStatus, updateResult?: object) {
  const progressionFindUnique = vi.fn().mockResolvedValue({
    id: 'prog-1',
    status: currentStatus,
  });
  const progressionUpdate = vi.fn().mockResolvedValue(
    updateResult ?? {
      id: 'prog-1',
      status: 'EN_COURS',
      userId: 'user-1',
      cohortModuleId: 'cm-1',
      dueDate: new Date(),
      submittedAt: null,
      validatedAt: null,
      overrideBy: null,
      overrideReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  );

  // $transaction reçoit un callback qui prend un "tx" en paramètre
  const prisma = {
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        progression: {
          findUnique: progressionFindUnique,
          update: progressionUpdate,
        },
      };
      return fn(tx);
    }),
  };

  return { prisma, progressionFindUnique, progressionUpdate };
}

// ─── VALID_TRANSITIONS matrice ────────────────────────────────────────────────

describe('VALID_TRANSITIONS — matrice complète', () => {
  it('A_VENIR → EN_COURS est valide', () => {
    expect(VALID_TRANSITIONS.get('A_VENIR')).toContain('EN_COURS');
  });

  it('EN_COURS → SOUMIS est valide', () => {
    expect(VALID_TRANSITIONS.get('EN_COURS')).toContain('SOUMIS');
  });

  it('EN_COURS → BLOQUE est valide', () => {
    expect(VALID_TRANSITIONS.get('EN_COURS')).toContain('BLOQUE');
  });

  it('EN_COURS → EN_ALERTE est valide', () => {
    expect(VALID_TRANSITIONS.get('EN_COURS')).toContain('EN_ALERTE');
  });

  it('EN_COURS → EN_RETARD est valide', () => {
    expect(VALID_TRANSITIONS.get('EN_COURS')).toContain('EN_RETARD');
  });

  it('SOUMIS → VALIDE est valide', () => {
    expect(VALID_TRANSITIONS.get('SOUMIS')).toContain('VALIDE');
  });

  it('SOUMIS → EN_COURS est valide (retry après échec harnais)', () => {
    expect(VALID_TRANSITIONS.get('SOUMIS')).toContain('EN_COURS');
  });

  it('SOUMIS → EN_ALERTE est valide', () => {
    expect(VALID_TRANSITIONS.get('SOUMIS')).toContain('EN_ALERTE');
  });

  it('SOUMIS → EN_RETARD est valide', () => {
    expect(VALID_TRANSITIONS.get('SOUMIS')).toContain('EN_RETARD');
  });

  it('EN_ALERTE → EN_RETARD est valide', () => {
    expect(VALID_TRANSITIONS.get('EN_ALERTE')).toContain('EN_RETARD');
  });

  it('VALIDE est absent de la matrice (état terminal)', () => {
    expect(VALID_TRANSITIONS.has('VALIDE')).toBe(false);
  });

  it('VALIDE_OVERRIDE est absent de la matrice (état terminal)', () => {
    expect(VALID_TRANSITIONS.has('VALIDE_OVERRIDE')).toBe(false);
  });
});

// ─── Transitions invalides ────────────────────────────────────────────────────

describe('transition() — transitions invalides', () => {
  it('A_VENIR → SOUMIS lève InvalidTransitionError', async () => {
    const { prisma } = makePrisma('A_VENIR');

    await expect(transition(prisma as any, 'prog-1', 'A_VENIR', 'SOUMIS')).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
  });

  it('VALIDE → EN_COURS lève InvalidTransitionError (état terminal)', async () => {
    const { prisma } = makePrisma('VALIDE');

    await expect(transition(prisma as any, 'prog-1', 'VALIDE', 'EN_COURS')).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
  });

  it('VALIDE_OVERRIDE → EN_COURS lève InvalidTransitionError (état terminal)', async () => {
    const { prisma } = makePrisma('VALIDE_OVERRIDE');

    await expect(
      transition(prisma as any, 'prog-1', 'VALIDE_OVERRIDE', 'EN_COURS'),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it('InvalidTransitionError expose from et to', async () => {
    const { prisma } = makePrisma('A_VENIR');

    const err = await transition(prisma as any, 'prog-1', 'A_VENIR', 'SOUMIS').catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(InvalidTransitionError);
    expect((err as InvalidTransitionError).from).toBe('A_VENIR');
    expect((err as InvalidTransitionError).to).toBe('SOUMIS');
  });

  it('VALIDE_OVERRIDE sans reason lève InvalidTransitionError', async () => {
    const { prisma } = makePrisma('EN_COURS');

    await expect(
      transition(prisma as any, 'prog-1', 'EN_COURS', 'VALIDE_OVERRIDE'),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it('VALIDE_OVERRIDE avec reason vide lève InvalidTransitionError', async () => {
    const { prisma } = makePrisma('EN_COURS');

    await expect(
      transition(prisma as any, 'prog-1', 'EN_COURS', 'VALIDE_OVERRIDE', '  '),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });
});

// ─── Transitions valides ──────────────────────────────────────────────────────

describe('transition() — transitions valides', () => {
  it('A_VENIR → EN_COURS met à jour le statut', async () => {
    const { prisma, progressionUpdate } = makePrisma('A_VENIR', {
      id: 'prog-1',
      status: 'EN_COURS',
    });

    const result = await transition(prisma as any, 'prog-1', 'A_VENIR', 'EN_COURS');

    expect(result.status).toBe('EN_COURS');
    expect(progressionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prog-1' },
        data: expect.objectContaining({ status: 'EN_COURS' }),
      }),
    );
  });

  it('EN_COURS → SOUMIS définit submittedAt', async () => {
    const { prisma, progressionUpdate } = makePrisma('EN_COURS', {
      id: 'prog-1',
      status: 'SOUMIS',
      submittedAt: new Date(),
    });

    await transition(prisma as any, 'prog-1', 'EN_COURS', 'SOUMIS');

    const updateData = progressionUpdate.mock.calls[0]?.[0];
    expect(updateData?.data?.submittedAt).toBeInstanceOf(Date);
  });

  it('SOUMIS → VALIDE définit validatedAt', async () => {
    const { prisma, progressionUpdate } = makePrisma('SOUMIS', {
      id: 'prog-1',
      status: 'VALIDE',
      validatedAt: new Date(),
    });

    await transition(prisma as any, 'prog-1', 'SOUMIS', 'VALIDE');

    const updateData = progressionUpdate.mock.calls[0]?.[0];
    expect(updateData?.data?.validatedAt).toBeInstanceOf(Date);
  });

  it('EN_COURS → VALIDE_OVERRIDE avec reason stocke overrideBy et overrideReason', async () => {
    const { prisma, progressionUpdate } = makePrisma('EN_COURS', {
      id: 'prog-1',
      status: 'VALIDE_OVERRIDE',
    });

    await transition(
      prisma as any,
      'prog-1',
      'EN_COURS',
      'VALIDE_OVERRIDE',
      'Urgence pédagogique',
      'formateur-uuid',
    );

    const updateData = progressionUpdate.mock.calls[0]?.[0];
    expect(updateData?.data?.overrideBy).toBe('formateur-uuid');
    expect(updateData?.data?.overrideReason).toBe('Urgence pédagogique');
  });

  it('SOUMIS → VALIDE_OVERRIDE depuis état terminal de source invalide lève erreur', async () => {
    const { prisma } = makePrisma('VALIDE');

    await expect(
      transition(prisma as any, 'prog-1', 'VALIDE', 'VALIDE_OVERRIDE', 'raison', 'formateur'),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });
});

// ─── Race condition ───────────────────────────────────────────────────────────

describe('transition() — protection race condition', () => {
  it('lève une erreur si le statut DB diffère du statut attendu', async () => {
    // Simule un race condition : on attend EN_COURS mais DB retourne SOUMIS
    const findUnique = vi.fn().mockResolvedValue({ id: 'prog-1', status: 'SOUMIS' });
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          progression: { findUnique, update: vi.fn() },
        });
      }),
    };

    await expect(transition(prisma as any, 'prog-1', 'EN_COURS', 'SOUMIS')).rejects.toThrow(
      /Race condition/,
    );
  });

  it('lève une erreur si la progression est introuvable', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        return fn({
          progression: { findUnique, update: vi.fn() },
        });
      }),
    };

    await expect(transition(prisma as any, 'prog-missing', 'EN_COURS', 'SOUMIS')).rejects.toThrow(
      /introuvable/,
    );
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

describe('isTerminal()', () => {
  it('retourne true pour VALIDE', () => {
    expect(isTerminal('VALIDE')).toBe(true);
  });

  it('retourne true pour VALIDE_OVERRIDE', () => {
    expect(isTerminal('VALIDE_OVERRIDE')).toBe(true);
  });

  it('retourne false pour EN_COURS', () => {
    expect(isTerminal('EN_COURS')).toBe(false);
  });

  it('retourne false pour A_VENIR', () => {
    expect(isTerminal('A_VENIR')).toBe(false);
  });

  it('retourne false pour EN_RETARD', () => {
    expect(isTerminal('EN_RETARD')).toBe(false);
  });
});

describe('availableTransitions()', () => {
  it('retourne [] pour VALIDE (terminal)', () => {
    expect(availableTransitions('VALIDE')).toEqual([]);
  });

  it('retourne [] pour VALIDE_OVERRIDE (terminal)', () => {
    expect(availableTransitions('VALIDE_OVERRIDE')).toEqual([]);
  });

  it('retourne les transitions pour EN_COURS', () => {
    const transitions = availableTransitions('EN_COURS');
    expect(transitions).toContain('SOUMIS');
    expect(transitions).toContain('BLOQUE');
  });

  it('retourne les transitions pour A_VENIR', () => {
    expect(availableTransitions('A_VENIR')).toContain('EN_COURS');
  });
});
