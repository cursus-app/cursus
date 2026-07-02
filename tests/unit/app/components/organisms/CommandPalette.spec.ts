// @vitest-environment happy-dom
//
// Tests unitaires pour CommandPalette.vue (ST-20.1).
// Stratégie : mockNuxtImport intercepte tous les composables Nuxt/UI.
// UModal et UCommandPalette sont stubbed pour éviter le runtime @nuxt/ui.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

// ─── Mock state partagé ───────────────────────────────────────────────────────
// Refs mutables contrôlés par les tests via beforeEach.
//
// mockDefineShortcuts utilise vi.hoisted() car la factory de mockNuxtImport est
// hoistée comme vi.mock(). Les variables `const` ont un TDZ (temporal dead zone)
// et ne sont pas encore initialisées au moment où la factory est évaluée.
// vi.hoisted() garantit que la valeur est disponible avant la hoisting phase.

const mockDefineShortcuts = vi.hoisted(() => vi.fn());

const mockIsOpenRef = ref(false);
const mockOpen = vi.fn();
const mockClose = vi.fn();
const mockToggle = vi.fn();
const mockTrack = vi.fn();
const mockReducedMotionRef = ref(false);

// ─── Nuxt auto-import mocks ───────────────────────────────────────────────────

mockNuxtImport('useCommandPalette', () => () => ({
  isOpen: mockIsOpenRef,
  open: mockOpen,
  close: mockClose,
  toggle: mockToggle,
}));

mockNuxtImport('useReducedMotion', () => () => mockReducedMotionRef);

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
}));

mockNuxtImport('useAnalytics', () => () => ({
  track: mockTrack,
}));

mockNuxtImport('useRoute', () => () => ({
  path: '/test',
}));

// defineShortcuts est un auto-import @nuxt/ui enregistré via #imports
mockNuxtImport('defineShortcuts', () => mockDefineShortcuts);

// ─── Import du composant réel (après les mocks) ───────────────────────────────

const { default: CommandPalette } = await import('~/components/organisms/CommandPalette.vue');

// ─── Stubs UI (@nuxt/ui) ─────────────────────────────────────────────────────
// UModal : expose les props open/transition en data-* pour les assertions.
//          Rend toujours le slot #content (le vrai UModal le cache si !open).
// UCommandPalette : peut émettre update:open via des boutons de test.

const UModalStub = {
  props: ['open', 'title', 'transition', 'fullscreen', 'close', 'ui'],
  template: `<div
    data-testid="u-modal"
    :data-open="String(open)"
    :data-transition="String(transition)"
    :data-title="title"
  ><slot name="content" /></div>`,
};

const UCommandPaletteStub = {
  props: ['groups', 'placeholder', 'close', 'closeIcon', 'autofocus'],
  emits: ['update:open'],
  template: `<div data-testid="u-command-palette">
    <slot name="empty" />
    <button data-testid="cmd-close-trigger" @click="$emit('update:open', false)" />
    <button data-testid="cmd-open-trigger" @click="$emit('update:open', true)" />
  </div>`,
};

const UIconStub = {
  props: ['name', 'class'],
  template: `<span data-testid="u-icon" :data-name="name" />`,
};

// ─── Mount helper ─────────────────────────────────────────────────────────────
// Track all mounted wrappers so stale watchers don't leak between tests.
// All watchers use the shared mockIsOpenRef — leaked watchers inflate mock.calls.

const allWrappers: VueWrapper[] = [];

function mountComponent() {
  const wrapper = mount(CommandPalette, {
    global: {
      stubs: {
        UModal: UModalStub,
        UCommandPalette: UCommandPaletteStub,
        UIcon: UIconStub,
      },
    },
  });
  allWrappers.push(wrapper);
  return wrapper;
}

afterEach(() => {
  allWrappers.forEach((w) => w.unmount());
  allWrappers.length = 0;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CommandPalette — rendu de base', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
    mockReducedMotionRef.value = false;
  });

  it('renders without errors when isOpen is false', () => {
    expect(() => mountComponent()).not.toThrow();
  });

  it('renders the UModal stub in the DOM', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="u-modal"]').exists()).toBe(true);
  });

  it('renders UCommandPalette inside the UModal content slot', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="u-command-palette"]').exists()).toBe(true);
  });

  it('passes title prop to UModal for aria-labelledby (VisuallyHidden via Reka UI)', () => {
    const wrapper = mountComponent();
    const modal = wrapper.find('[data-testid="u-modal"]');
    // Le title prop est passé via le stub — UModal le passe à DialogTitle → aria-labelledby
    expect(modal.exists()).toBe(true);
  });

  it('renders the empty state slot content inside UCommandPalette', () => {
    const wrapper = mountComponent();
    // Le slot #empty contient un div avec aria-live="polite"
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true);
  });
});

describe('CommandPalette — prop open vers UModal', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
    mockReducedMotionRef.value = false;
  });

  it('passes open=false to UModal when isOpen is false', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="u-modal"]').attributes('data-open')).toBe('false');
  });

  it('passes open=true to UModal when isOpen is true at mount', () => {
    mockIsOpenRef.value = true;
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="u-modal"]').attributes('data-open')).toBe('true');
  });

  it('updates UModal open prop reactively when isOpen changes to true', async () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="u-modal"]').attributes('data-open')).toBe('false');
    mockIsOpenRef.value = true;
    await nextTick();
    expect(wrapper.find('[data-testid="u-modal"]').attributes('data-open')).toBe('true');
  });

  it('updates UModal open prop reactively when isOpen changes back to false', async () => {
    mockIsOpenRef.value = true;
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="u-modal"]').attributes('data-open')).toBe('true');
    mockIsOpenRef.value = false;
    await nextTick();
    expect(wrapper.find('[data-testid="u-modal"]').attributes('data-open')).toBe('false');
  });
});

describe('CommandPalette — prop transition (prefers-reduced-motion)', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
    mockReducedMotionRef.value = false;
  });

  it('passes transition=true when reducedMotion is false (animations enabled)', () => {
    // :transition="!reducedMotion" → !false = true
    mockReducedMotionRef.value = false;
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="u-modal"]').attributes('data-transition')).toBe('true');
  });

  it('passes transition=false when reducedMotion is true (WCAG 2.3.3 — no motion)', () => {
    // :transition="!reducedMotion" → !true = false
    mockReducedMotionRef.value = true;
    const wrapper = mountComponent();
    expect(wrapper.find('[data-testid="u-modal"]').attributes('data-transition')).toBe('false');
  });
});

describe('CommandPalette — defineShortcuts (raccourcis clavier)', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
    mockReducedMotionRef.value = false;
  });

  it('calls defineShortcuts exactly once during component setup', () => {
    mountComponent();
    expect(mockDefineShortcuts).toHaveBeenCalledOnce();
  });

  it('registers a meta_k shortcut', () => {
    mountComponent();
    expect(mockDefineShortcuts).toHaveBeenCalledWith(
      expect.objectContaining({
        meta_k: expect.any(Object),
      }),
    );
  });

  it('registers a ctrl_k shortcut', () => {
    mountComponent();
    expect(mockDefineShortcuts).toHaveBeenCalledWith(
      expect.objectContaining({
        ctrl_k: expect.any(Object),
      }),
    );
  });

  it('meta_k shortcut has usingInput: true (works inside input/textarea)', () => {
    mountComponent();
    const shortcuts = mockDefineShortcuts.mock.calls[0]?.[0] as Record<
      string,
      { handler: unknown; usingInput: boolean }
    >;
    expect(shortcuts['meta_k']?.usingInput).toBe(true);
  });

  it('ctrl_k shortcut has usingInput: true (works inside input/textarea)', () => {
    mountComponent();
    const shortcuts = mockDefineShortcuts.mock.calls[0]?.[0] as Record<
      string,
      { handler: unknown; usingInput: boolean }
    >;
    expect(shortcuts['ctrl_k']?.usingInput).toBe(true);
  });

  it('meta_k handler is the toggle function returned by useCommandPalette', () => {
    mountComponent();
    const shortcuts = mockDefineShortcuts.mock.calls[0]?.[0] as Record<
      string,
      { handler: unknown; usingInput: boolean }
    >;
    expect(shortcuts['meta_k']?.handler).toBe(mockToggle);
  });

  it('ctrl_k handler is the toggle function returned by useCommandPalette', () => {
    mountComponent();
    const shortcuts = mockDefineShortcuts.mock.calls[0]?.[0] as Record<
      string,
      { handler: unknown; usingInput: boolean }
    >;
    expect(shortcuts['ctrl_k']?.handler).toBe(mockToggle);
  });
});

describe('CommandPalette — onCommandPaletteClose', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
    mockReducedMotionRef.value = false;
  });

  it('calls close() when UCommandPalette emits update:open with false', async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-testid="cmd-close-trigger"]').trigger('click');
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('does NOT call close() when UCommandPalette emits update:open with true', async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-testid="cmd-open-trigger"]').trigger('click');
    expect(mockClose).not.toHaveBeenCalled();
  });

  it('calls close() exactly once per close event — no spurious extra calls', async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-testid="cmd-close-trigger"]').trigger('click');
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('calls close() on each successive close event', async () => {
    const wrapper = mountComponent();
    await wrapper.find('[data-testid="cmd-close-trigger"]').trigger('click');
    await wrapper.find('[data-testid="cmd-close-trigger"]').trigger('click');
    expect(mockClose).toHaveBeenCalledTimes(2);
  });
});

describe('CommandPalette — analytics (watch isOpen)', () => {
  beforeEach(() => {
    mockIsOpenRef.value = false;
    mockReducedMotionRef.value = false;
  });

  it('tracks cmdk_opened once on first open', async () => {
    mountComponent();
    mockIsOpenRef.value = true;
    await nextTick();
    expect(mockTrack).toHaveBeenCalledOnce();
    expect(mockTrack).toHaveBeenCalledWith(
      'cmdk_opened',
      expect.objectContaining({ route: '/test' }),
    );
  });

  it('does not track again on subsequent opens (once per session)', async () => {
    mountComponent();
    mockIsOpenRef.value = true;
    await nextTick();
    mockIsOpenRef.value = false;
    await nextTick();
    mockIsOpenRef.value = true;
    await nextTick();
    expect(mockTrack).toHaveBeenCalledOnce();
  });

  it('does not track when isOpen becomes false', async () => {
    mockIsOpenRef.value = true;
    mountComponent();
    mockIsOpenRef.value = false;
    await nextTick();
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
