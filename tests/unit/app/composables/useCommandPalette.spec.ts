// @vitest-environment happy-dom
//
// Tests unitaires pour useCommandPalette (ST-20.1).
// Stratégie : mockNuxtImport intercepte useState (Nuxt auto-import).
// Un ref mutable contrôle l'état entre les tests via beforeEach.

import { beforeEach, describe, expect, it } from 'vitest';
import { isReadonly, ref } from 'vue';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

// ─── Mock useState (Nuxt auto-import) ────────────────────────────────────────
// useState est remplacé par une fonction qui ignore la clé et l'init factory,
// et retourne toujours le même ref mutable contrôlé par les tests.

const mockIsOpenRef = ref(false);

mockNuxtImport('useState', () => (_key: string, _init?: () => unknown) => mockIsOpenRef);

// ─── Import du composable réel (après le mock) ────────────────────────────────

const { useCommandPalette } = await import('~/composables/useCommandPalette');

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useCommandPalette — état initial', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
  });

  it('isOpen starts as false', () => {
    const { isOpen } = useCommandPalette();
    expect(isOpen.value).toBe(false);
  });
});

describe('useCommandPalette — open()', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
  });

  it('sets isOpen to true when called from false', () => {
    const { isOpen, open } = useCommandPalette();
    open();
    expect(isOpen.value).toBe(true);
  });

  it('is idempotent — calling open() twice keeps isOpen true', () => {
    const { isOpen, open } = useCommandPalette();
    open();
    open();
    expect(isOpen.value).toBe(true);
  });

  it('is idempotent — calling open() three times keeps isOpen true', () => {
    const { isOpen, open } = useCommandPalette();
    open();
    open();
    open();
    expect(isOpen.value).toBe(true);
  });
});

describe('useCommandPalette — close()', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
  });

  it('sets isOpen to false when called from true', () => {
    const { isOpen, open, close } = useCommandPalette();
    open();
    expect(isOpen.value).toBe(true);
    close();
    expect(isOpen.value).toBe(false);
  });

  it('is idempotent — calling close() twice keeps isOpen false', () => {
    const { isOpen, close } = useCommandPalette();
    // isOpen starts false
    close();
    close();
    expect(isOpen.value).toBe(false);
  });

  it('is idempotent — calling close() after open() then close() stays false', () => {
    const { isOpen, open, close } = useCommandPalette();
    open();
    close();
    close();
    expect(isOpen.value).toBe(false);
  });
});

describe('useCommandPalette — toggle()', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
  });

  it('flips isOpen from false to true on first call', () => {
    const { isOpen, toggle } = useCommandPalette();
    toggle();
    expect(isOpen.value).toBe(true);
  });

  it('flips isOpen from true to false on second call', () => {
    const { isOpen, toggle } = useCommandPalette();
    toggle();
    toggle();
    expect(isOpen.value).toBe(false);
  });

  it('alternates on successive calls — FTFT pattern', () => {
    const { isOpen, toggle } = useCommandPalette();
    toggle();
    expect(isOpen.value).toBe(true);
    toggle();
    expect(isOpen.value).toBe(false);
    toggle();
    expect(isOpen.value).toBe(true);
    toggle();
    expect(isOpen.value).toBe(false);
  });

  it('can be called after open() to close — mirrors toggle(false)', () => {
    const { isOpen, open, toggle } = useCommandPalette();
    open();
    toggle();
    expect(isOpen.value).toBe(false);
  });
});

describe('useCommandPalette — isOpen readonly', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
  });

  it('isOpen is wrapped with readonly() — isReadonly returns true', () => {
    const { isOpen } = useCommandPalette();
    expect(isReadonly(isOpen)).toBe(true);
  });

  it('isOpen.value reflects the underlying state (readable)', () => {
    const { isOpen, open } = useCommandPalette();
    expect(isOpen.value).toBe(false);
    open();
    expect(isOpen.value).toBe(true);
  });
});

describe('useCommandPalette — open/close/toggle interop', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
  });

  it('open() → toggle() → isOpen is false', () => {
    const { isOpen, open, toggle } = useCommandPalette();
    open();
    toggle();
    expect(isOpen.value).toBe(false);
  });

  it('close() → toggle() → isOpen is true', () => {
    const { isOpen, close, toggle } = useCommandPalette();
    close(); // already false but explicit
    toggle();
    expect(isOpen.value).toBe(true);
  });

  it('multiple composable instances share the same state via mocked useState', () => {
    // In production, useState returns the same ref for the same key.
    // The mock simulates this by always returning mockIsOpenRef.
    const a = useCommandPalette();
    const b = useCommandPalette();
    a.open();
    expect(b.isOpen.value).toBe(true);
  });
});
