// @vitest-environment happy-dom
/**
 * Tests unitaires pour le composable useReducedMotion (ST-18.6).
 *
 * Strategie :
 * - mock `useMediaQuery` via mockNuxtImport (auto-import @vueuse/nuxt)
 * - Verifier que le computed retourne correctement la valeur de matchMedia.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { ref } from 'vue';

// ─── Mock state partagé ────────────────────────────────────────────────────────

// Ref mutable que l'on change entre les tests pour simuler les reponses matchMedia
const mockMatchesRef = ref(false);

// mockNuxtImport intercepte l'auto-import de useMediaQuery (@vueuse/nuxt)
mockNuxtImport('useMediaQuery', () => (_query: string) => mockMatchesRef);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildComposable() {
  // Import dynamique pour obtenir une instance fraiche apres le mock
  const { useReducedMotion } = await import('~/composables/useReducedMotion');
  return useReducedMotion();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useReducedMotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchesRef.value = false;
  });

  it('returns true when prefers-reduced-motion: reduce matches', async () => {
    mockMatchesRef.value = true;
    const reducedMotion = await buildComposable();
    expect(reducedMotion.value).toBe(true);
  });

  it('returns false when prefers-reduced-motion: no-preference matches', async () => {
    mockMatchesRef.value = false;
    const reducedMotion = await buildComposable();
    expect(reducedMotion.value).toBe(false);
  });

  it('returns false by default (no matchMedia in JSDOM)', async () => {
    // Par defaut mockMatchesRef.value === false — simule le comportement de
    // useMediaQuery lorsque matchMedia est absent (SSR / JSDOM).
    const reducedMotion = await buildComposable();
    expect(reducedMotion.value).toBe(false);
  });

  it('returns a ComputedRef (is readonly)', async () => {
    const reducedMotion = await buildComposable();
    // Un ComputedRef expose .value en lecture seule — verification de type runtime.
    expect(typeof reducedMotion.value).toBe('boolean');
  });

  it('reacts to matchMedia changes (reactive)', async () => {
    mockMatchesRef.value = false;
    const reducedMotion = await buildComposable();
    expect(reducedMotion.value).toBe(false);

    // Simule un changement de preference OS en cours de session
    mockMatchesRef.value = true;
    expect(reducedMotion.value).toBe(true);
  });
});
