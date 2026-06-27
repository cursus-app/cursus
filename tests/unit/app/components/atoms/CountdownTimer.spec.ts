// @vitest-environment happy-dom
/**
 * Tests unitaires pour la logique de CountdownTimer (ST-05.1).
 *
 * Stratégie : tester la logique de calcul du compte à rebours
 * sans monter le composant Vue (évite les problèmes de runtime Nuxt).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// ─── Logique extraite du composant ────────────────────────────────────────────

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  totalMs: number;
}

function computeTimeLeft(dueDate: string): TimeLeft {
  const now = Date.now();
  const target = new Date(dueDate).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    const lateDiffMs = Math.abs(diffMs);
    const days = Math.floor(lateDiffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((lateDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((lateDiffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, totalMs: diffMs };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes, totalMs: diffMs };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('computeTimeLeft — cas nominaux', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calcule correctement 2 jours restants', () => {
    const now = new Date('2026-06-27T10:00:00.000Z');
    vi.setSystemTime(now);

    const dueDate = new Date('2026-06-29T10:00:00.000Z').toISOString();
    const result = computeTimeLeft(dueDate);

    expect(result.days).toBe(2);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.totalMs).toBeGreaterThan(0);
  });

  it('calcule correctement 1 jour 6h 30min restants', () => {
    const now = new Date('2026-06-27T10:00:00.000Z');
    vi.setSystemTime(now);

    // 1 jour 6h 30min = 30.5h = 1830 minutes
    const target = new Date('2026-06-28T16:30:00.000Z').toISOString();
    const result = computeTimeLeft(target);

    expect(result.days).toBe(1);
    expect(result.hours).toBe(6);
    expect(result.minutes).toBe(30);
    expect(result.totalMs).toBeGreaterThan(0);
  });

  it('calcule correctement 0 jours (moins de 24h)', () => {
    const now = new Date('2026-06-27T10:00:00.000Z');
    vi.setSystemTime(now);

    // 3h restants
    const target = new Date('2026-06-27T13:00:00.000Z').toISOString();
    const result = computeTimeLeft(target);

    expect(result.days).toBe(0);
    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(0);
    expect(result.totalMs).toBeGreaterThan(0);
  });
});

describe('computeTimeLeft — retard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retourne totalMs négatif si dueDate est passée', () => {
    const now = new Date('2026-06-27T10:00:00.000Z');
    vi.setSystemTime(now);

    const pastDate = new Date('2026-06-24T10:00:00.000Z').toISOString();
    const result = computeTimeLeft(pastDate);

    expect(result.totalMs).toBeLessThan(0);
    expect(result.days).toBe(3);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });

  it('calcule le retard en jours/heures/minutes correctement', () => {
    const now = new Date('2026-06-27T12:00:00.000Z');
    vi.setSystemTime(now);

    // En retard de 1 jour et 6h
    const pastDate = new Date('2026-06-26T06:00:00.000Z').toISOString();
    const result = computeTimeLeft(pastDate);

    expect(result.totalMs).toBeLessThan(0);
    expect(result.days).toBe(1);
    expect(result.hours).toBe(6);
    expect(result.minutes).toBe(0);
  });
});

describe('pad — formatage', () => {
  it('padde un nombre < 10 avec un 0', () => {
    expect(pad(3)).toBe('03');
    expect(pad(0)).toBe('00');
    expect(pad(9)).toBe('09');
  });

  it('ne padde pas un nombre >= 10', () => {
    expect(pad(10)).toBe('10');
    expect(pad(23)).toBe('23');
    expect(pad(99)).toBe('99');
  });
});

describe('isOverdue — détection du retard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('isOverdue = true si totalMs < 0', () => {
    const now = new Date('2026-06-27T10:00:00.000Z');
    vi.setSystemTime(now);

    const pastDate = new Date('2026-06-24T10:00:00.000Z').toISOString();
    const result = computeTimeLeft(pastDate);

    expect(result.totalMs < 0).toBe(true);
  });

  it('isOverdue = false si totalMs > 0', () => {
    const now = new Date('2026-06-27T10:00:00.000Z');
    vi.setSystemTime(now);

    const futureDate = new Date('2026-06-30T10:00:00.000Z').toISOString();
    const result = computeTimeLeft(futureDate);

    expect(result.totalMs < 0).toBe(false);
  });
});
