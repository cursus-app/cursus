// Tests unitaires pour l'utilitaire diffCursusVersions (ST-03.5).
// Pas de dépendance Nuxt — pure logique TypeScript.

import { describe, it, expect } from 'vitest';
import { diffCursusVersions } from '~/utils/cursusDiff';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MODULE_A = {
  id: 'mod-a',
  week: 1,
  title: 'Intro HTML',
  objectives: 'Learn HTML basics',
  resourcesJson: null,
  deliverableSpecJson: null,
  xpReward: 100,
};

const MODULE_B = {
  id: 'mod-b',
  week: 2,
  title: 'CSS Fundamentals',
  objectives: 'Learn CSS basics',
  resourcesJson: null,
  deliverableSpecJson: null,
  xpReward: 150,
};

const MODULE_C = {
  id: 'mod-c',
  week: 3,
  title: 'JavaScript',
  objectives: 'Learn JS basics',
  resourcesJson: null,
  deliverableSpecJson: null,
  xpReward: 200,
};

function makeSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cursus-1',
    title: 'Web Dev',
    description: 'A web dev cursus',
    durationWeeks: 12,
    modules: [MODULE_A, MODULE_B],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('diffCursusVersions — identical snapshots', () => {
  it('returns no changes when both snapshots are identical', () => {
    const snap = makeSnapshot();
    const diff = diffCursusVersions(snap, snap);

    expect(diff.titleChanged).toBe(false);
    expect(diff.descriptionChanged).toBe(false);
    expect(diff.durationChanged).toBe(false);
    expect(diff.modulesAdded).toBe(0);
    expect(diff.modulesRemoved).toBe(0);
    expect(diff.modulesModified).toBe(0);
  });

  it('marks all modules as unchanged when snapshots are identical', () => {
    const snap = makeSnapshot();
    const diff = diffCursusVersions(snap, snap);

    expect(diff.modules).toHaveLength(2);
    expect(diff.modules.every((m) => m.change === 'unchanged')).toBe(true);
  });

  it('returns no changes for deep-equal resourcesJson objects', () => {
    const resources = { type: 'link', url: 'https://example.com' };
    const snap1 = makeSnapshot({ modules: [{ ...MODULE_A, resourcesJson: resources }] });
    const snap2 = makeSnapshot({ modules: [{ ...MODULE_A, resourcesJson: { ...resources } }] });

    const diff = diffCursusVersions(snap1, snap2);
    expect(diff.modulesModified).toBe(0);
  });
});

describe('diffCursusVersions — module added', () => {
  it('detects a module present in v2 but not in v1 as added', () => {
    const v1 = makeSnapshot({ modules: [MODULE_A] });
    const v2 = makeSnapshot({ modules: [MODULE_A, MODULE_B] });

    const diff = diffCursusVersions(v1, v2);

    expect(diff.modulesAdded).toBe(1);
    expect(diff.modulesRemoved).toBe(0);
    const added = diff.modules.find((m) => m.id === MODULE_B.id);
    expect(added?.change).toBe('added');
  });

  it('sets correct title and week for added module', () => {
    const v1 = makeSnapshot({ modules: [] });
    const v2 = makeSnapshot({ modules: [MODULE_C] });

    const diff = diffCursusVersions(v1, v2);
    const added = diff.modules.find((m) => m.id === MODULE_C.id);

    expect(added?.title).toBe(MODULE_C.title);
    expect(added?.week).toBe(MODULE_C.week);
  });
});

describe('diffCursusVersions — module removed', () => {
  it('detects a module present in v1 but not in v2 as removed', () => {
    const v1 = makeSnapshot({ modules: [MODULE_A, MODULE_B] });
    const v2 = makeSnapshot({ modules: [MODULE_A] });

    const diff = diffCursusVersions(v1, v2);

    expect(diff.modulesRemoved).toBe(1);
    expect(diff.modulesAdded).toBe(0);
    const removed = diff.modules.find((m) => m.id === MODULE_B.id);
    expect(removed?.change).toBe('removed');
  });

  it('does not affect unchanged modules when one is removed', () => {
    const v1 = makeSnapshot({ modules: [MODULE_A, MODULE_B] });
    const v2 = makeSnapshot({ modules: [MODULE_A] });

    const diff = diffCursusVersions(v1, v2);
    const unchanged = diff.modules.find((m) => m.id === MODULE_A.id);

    expect(unchanged?.change).toBe('unchanged');
  });
});

describe('diffCursusVersions — module title changed', () => {
  it('detects title change as modified and reports "title" in fields', () => {
    const modifiedModule = { ...MODULE_A, title: 'Advanced HTML' };
    const v1 = makeSnapshot({ modules: [MODULE_A] });
    const v2 = makeSnapshot({ modules: [modifiedModule] });

    const diff = diffCursusVersions(v1, v2);

    expect(diff.modulesModified).toBe(1);
    const modified = diff.modules.find((m) => m.id === MODULE_A.id);
    expect(modified?.change).toBe('modified');
    expect(modified?.fields).toContain('title');
  });

  it('uses the new title from v2 when displaying a modified module', () => {
    const modifiedModule = { ...MODULE_A, title: 'Advanced HTML' };
    const v1 = makeSnapshot({ modules: [MODULE_A] });
    const v2 = makeSnapshot({ modules: [modifiedModule] });

    const diff = diffCursusVersions(v1, v2);
    const modified = diff.modules.find((m) => m.id === MODULE_A.id);

    expect(modified?.title).toBe('Advanced HTML');
  });
});

describe('diffCursusVersions — cursus metadata changed', () => {
  it('detects title change at cursus level', () => {
    const v1 = makeSnapshot({ title: 'Old Title' });
    const v2 = makeSnapshot({ title: 'New Title' });

    const diff = diffCursusVersions(v1, v2);

    expect(diff.titleChanged).toBe(true);
    expect(diff.descriptionChanged).toBe(false);
    expect(diff.durationChanged).toBe(false);
  });

  it('detects description change', () => {
    const v1 = makeSnapshot({ description: 'Old description' });
    const v2 = makeSnapshot({ description: 'New description' });

    const diff = diffCursusVersions(v1, v2);

    expect(diff.descriptionChanged).toBe(true);
    expect(diff.titleChanged).toBe(false);
  });

  it('detects durationWeeks change', () => {
    const v1 = makeSnapshot({ durationWeeks: 10 });
    const v2 = makeSnapshot({ durationWeeks: 16 });

    const diff = diffCursusVersions(v1, v2);

    expect(diff.durationChanged).toBe(true);
  });

  it('detects all metadata changes simultaneously', () => {
    const v1 = makeSnapshot({ title: 'T1', description: 'D1', durationWeeks: 10 });
    const v2 = makeSnapshot({ title: 'T2', description: 'D2', durationWeeks: 20 });

    const diff = diffCursusVersions(v1, v2);

    expect(diff.titleChanged).toBe(true);
    expect(diff.descriptionChanged).toBe(true);
    expect(diff.durationChanged).toBe(true);
  });
});

describe('diffCursusVersions — edge cases', () => {
  it('handles null/non-object snapshots gracefully', () => {
    expect(() => diffCursusVersions(null, null)).not.toThrow();
    const diff = diffCursusVersions(null, null);
    expect(diff.modules).toHaveLength(0);
    expect(diff.modulesAdded).toBe(0);
  });

  it('handles snapshots with no modules array', () => {
    const v1 = { title: 'A' };
    const v2 = { title: 'A', modules: [MODULE_A] };

    const diff = diffCursusVersions(v1, v2);

    expect(diff.modulesAdded).toBe(1);
    expect(diff.modulesRemoved).toBe(0);
  });

  it('detects xpReward change in a module', () => {
    const modifiedModule = { ...MODULE_A, xpReward: 200 };
    const v1 = makeSnapshot({ modules: [MODULE_A] });
    const v2 = makeSnapshot({ modules: [modifiedModule] });

    const diff = diffCursusVersions(v1, v2);

    const modified = diff.modules.find((m) => m.id === MODULE_A.id);
    expect(modified?.change).toBe('modified');
    expect(modified?.fields).toContain('xpReward');
  });
});
