// @vitest-environment happy-dom
//
// Tests unitaires pour useAppToast (ST-18.4).
// Stratégie : mockNuxtImport intercepte useToast auto-import de @nuxt/ui.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

// ─── Mock useToast (@nuxt/ui auto-import) ────────────────────────────────────

const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockToastsValue: { id: string; title: string }[] = [];

mockNuxtImport('useToast', () => () => ({
  add: mockAdd,
  remove: mockRemove,
  toasts: { value: mockToastsValue },
}));

// ─── Import du composable réel ────────────────────────────────────────────────

const { useAppToast } = await import('~/app/composables/useAppToast');

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAppToast', () => {
  beforeEach(() => {
    mockAdd.mockClear();
    mockRemove.mockClear();
    mockToastsValue.length = 0;
  });

  it('add() calls useToast().add with title', () => {
    const { add } = useAppToast();
    add({ title: 'Hello' });
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Hello' }));
  });

  it('add() uses default color neutral when no color provided', () => {
    const { add } = useAppToast();
    add({ title: 'Test' });
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'neutral' }));
  });

  it('add() uses default duration 5000 when no duration provided', () => {
    const { add } = useAppToast();
    add({ title: 'Test' });
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ duration: 5000 }));
  });

  it('add() includes description when provided', () => {
    const { add } = useAppToast();
    add({ title: 'Test', description: 'Ma description' });
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Ma description' }),
    );
  });

  it('add() does not include description when undefined', () => {
    const { add } = useAppToast();
    add({ title: 'Test' });
    const call = mockAdd.mock.calls[0]?.[0] as Record<string, unknown>;
    expect('description' in call).toBe(false);
  });

  it('add() purges oldest toasts when queue is full (MAX=3)', () => {
    mockToastsValue.push(
      { id: 't1', title: 'Toast 1' },
      { id: 't2', title: 'Toast 2' },
      { id: 't3', title: 'Toast 3' },
    );
    const { add } = useAppToast();
    add({ title: 'Toast 4' });
    expect(mockRemove).toHaveBeenCalledWith('t1');
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Toast 4' }));
  });

  it('add() does not purge when queue is below max', () => {
    mockToastsValue.push({ id: 't1', title: 'Toast 1' });
    const { add } = useAppToast();
    add({ title: 'Toast 2' });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it('success() calls add with success color and check icon', () => {
    const { success } = useAppToast();
    success('Bravo');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'success', icon: 'i-tabler-circle-check' }),
    );
  });

  it('success() includes description when provided', () => {
    const { success } = useAppToast();
    success('Bravo', 'Opération réussie');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Opération réussie' }),
    );
  });

  it('success() does not include description when undefined', () => {
    const { success } = useAppToast();
    success('Bravo');
    const call = mockAdd.mock.calls[0]?.[0] as Record<string, unknown>;
    expect('description' in call).toBe(false);
  });

  it('warning() calls add with warning color and triangle icon', () => {
    const { warning } = useAppToast();
    warning('Attention');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'warning', icon: 'i-tabler-alert-triangle' }),
    );
  });

  it('warning() includes description when provided', () => {
    const { warning } = useAppToast();
    warning('Attention', 'Vérifier les données');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Vérifier les données' }),
    );
  });

  it('danger() calls add with error color (nuxt/ui convention) and x icon', () => {
    const { danger } = useAppToast();
    danger('Erreur');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'error', icon: 'i-tabler-circle-x' }),
    );
  });

  it('danger() includes description when provided', () => {
    const { danger } = useAppToast();
    danger('Erreur', 'Impossible de sauvegarder');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Impossible de sauvegarder' }),
    );
  });

  it('info() calls add with info color and info-circle icon', () => {
    const { info } = useAppToast();
    info('Info');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ color: 'info', icon: 'i-tabler-info-circle' }),
    );
  });

  it('info() includes description when provided', () => {
    const { info } = useAppToast();
    info('Info', 'Détails supplémentaires');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Détails supplémentaires' }),
    );
  });

  it('add() uses custom duration when provided', () => {
    const { add } = useAppToast();
    add({ title: 'Test', duration: 10000 });
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ duration: 10000 }));
  });

  it('add() includes icon when provided', () => {
    const { add } = useAppToast();
    add({ title: 'Test', icon: 'i-tabler-star' });
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ icon: 'i-tabler-star' }));
  });

  it('add() does not include icon when undefined', () => {
    const { add } = useAppToast();
    add({ title: 'Test' });
    const call = mockAdd.mock.calls[0]?.[0] as Record<string, unknown>;
    expect('icon' in call).toBe(false);
  });
});
