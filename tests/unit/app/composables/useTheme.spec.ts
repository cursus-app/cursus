// @vitest-environment happy-dom
/**
 * Tests unitaires pour le composable useTheme (ST-18.5).
 *
 * Strategie : mockNuxtImport intercepte useColorMode / useAnalytics / useUserStore
 * sans instance Nuxt. $fetch est stubbe globalement. Chaque test cree une
 * instance fraiche du composable via import dynamique.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import type { ThemeValue } from '~/composables/useTheme';

// ─── Mock state partagé (plain objects — le computed lit la valeur au moment
// de l'appel, donc une mutation avant la creation du composable suffit) ────────

const mockColorMode = {
  preference: 'system' as string,
  value: 'light' as string,
};

const mockUserStore = { userId: null as string | null };

const mockTrack = vi.fn();
const mockFetch = vi.fn();

// ─── Nuxt auto-import mocks ────────────────────────────────────────────────────

mockNuxtImport('useColorMode', () => () => mockColorMode);
mockNuxtImport('useAnalytics', () => () => ({ track: mockTrack }));
mockNuxtImport('useUserStore', () => () => mockUserStore);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildComposable() {
  const { useTheme } = await import('~/composables/useTheme');
  return useTheme();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useTheme — computed theme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockColorMode.preference = 'system';
    mockColorMode.value = 'light';
    mockUserStore.userId = null;
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('returns colorMode.preference cast as ThemeValue when preference is "dark"', async () => {
    mockColorMode.preference = 'dark';
    const { theme } = await buildComposable();
    expect(theme.value).toBe<ThemeValue>('dark');
  });

  it('returns "light" when colorMode.preference is "light"', async () => {
    mockColorMode.preference = 'light';
    const { theme } = await buildComposable();
    expect(theme.value).toBe<ThemeValue>('light');
  });

  it('returns "system" when colorMode.preference is "system"', async () => {
    mockColorMode.preference = 'system';
    const { theme } = await buildComposable();
    expect(theme.value).toBe<ThemeValue>('system');
  });
});

describe('useTheme — computed isDark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockColorMode.preference = 'system';
    mockColorMode.value = 'light';
    mockUserStore.userId = null;
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('is true when colorMode.value === "dark"', async () => {
    mockColorMode.value = 'dark';
    const { isDark } = await buildComposable();
    expect(isDark.value).toBe(true);
  });

  it('is false when colorMode.value === "light"', async () => {
    mockColorMode.value = 'light';
    const { isDark } = await buildComposable();
    expect(isDark.value).toBe(false);
  });

  it('is false when colorMode.value is not "dark" (e.g. system-resolved light)', async () => {
    mockColorMode.value = 'system';
    const { isDark } = await buildComposable();
    expect(isDark.value).toBe(false);
  });
});

describe('useTheme — setTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockColorMode.preference = 'system';
    mockColorMode.value = 'light';
    mockUserStore.userId = null;
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('sets colorMode.preference to "dark" when setTheme("dark") is called', async () => {
    const { setTheme } = await buildComposable();
    await setTheme('dark');
    expect(mockColorMode.preference).toBe('dark');
  });

  it('sets colorMode.preference to "light" when setTheme("light") is called', async () => {
    mockColorMode.preference = 'dark';
    const { setTheme } = await buildComposable();
    await setTheme('light');
    expect(mockColorMode.preference).toBe('light');
  });

  it('sets colorMode.preference to "system" when setTheme("system") is called', async () => {
    mockColorMode.preference = 'dark';
    const { setTheme } = await buildComposable();
    await setTheme('system');
    expect(mockColorMode.preference).toBe('system');
  });

  it('calls track("theme_toggled") with correct from/to values (light → dark)', async () => {
    mockColorMode.preference = 'light';
    const { setTheme } = await buildComposable();
    await setTheme('dark');
    expect(mockTrack).toHaveBeenCalledWith('theme_toggled', { from: 'light', to: 'dark' });
  });

  it('calls track("theme_toggled") with correct from/to values (system → light)', async () => {
    mockColorMode.preference = 'system';
    const { setTheme } = await buildComposable();
    await setTheme('light');
    expect(mockTrack).toHaveBeenCalledWith('theme_toggled', { from: 'system', to: 'light' });
  });

  it('calls track exactly once per setTheme invocation', async () => {
    const { setTheme } = await buildComposable();
    await setTheme('dark');
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('does NOT call $fetch when userStore.userId is null (anonymous user)', async () => {
    mockUserStore.userId = null;
    const { setTheme } = await buildComposable();
    await setTheme('dark');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does NOT call $fetch when userStore.userId is empty string', async () => {
    mockUserStore.userId = '';
    const { setTheme } = await buildComposable();
    await setTheme('dark');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls PUT /api/me/preferences/theme with { theme } body when userId is truthy', async () => {
    mockUserStore.userId = 'user-123';
    const { setTheme } = await buildComposable();
    await setTheme('dark');
    expect(mockFetch).toHaveBeenCalledWith('/api/me/preferences/theme', {
      method: 'PUT',
      body: { theme: 'dark' },
    });
  });

  it('calls $fetch with body { theme: "light" } when setTheme("light") and userId truthy', async () => {
    mockUserStore.userId = 'user-456';
    const { setTheme } = await buildComposable();
    await setTheme('light');
    expect(mockFetch).toHaveBeenCalledWith('/api/me/preferences/theme', {
      method: 'PUT',
      body: { theme: 'light' },
    });
  });

  it('does not throw when $fetch fails (non-fatal — DB sync is best-effort)', async () => {
    mockUserStore.userId = 'user-789';
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { setTheme } = await buildComposable();
    await expect(setTheme('dark')).resolves.toBeUndefined();
  });

  it('still updates colorMode.preference even when $fetch fails', async () => {
    mockUserStore.userId = 'user-789';
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const { setTheme } = await buildComposable();
    await setTheme('dark');
    expect(mockColorMode.preference).toBe('dark');
  });
});

describe('useTheme — cycleTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockColorMode.preference = 'system';
    mockColorMode.value = 'light';
    mockUserStore.userId = null;
    vi.stubGlobal('$fetch', mockFetch);
  });

  it('cycles from "system" to "light"', async () => {
    mockColorMode.preference = 'system';
    const { cycleTheme } = await buildComposable();
    cycleTheme();
    // colorMode.preference is set synchronously inside setTheme (before the $fetch await)
    expect(mockColorMode.preference).toBe('light');
  });

  it('cycles from "light" to "dark"', async () => {
    mockColorMode.preference = 'light';
    const { cycleTheme } = await buildComposable();
    cycleTheme();
    expect(mockColorMode.preference).toBe('dark');
  });

  it('cycles from "dark" back to "system"', async () => {
    mockColorMode.preference = 'dark';
    const { cycleTheme } = await buildComposable();
    cycleTheme();
    expect(mockColorMode.preference).toBe('system');
  });

  it('falls back to "system" theme getter when preference is unknown, then cycles to "light"', async () => {
    // Runtime guard: isThemeValue('unknown') → false → theme.value = 'system'
    // cycleTheme: system → light
    mockColorMode.preference = 'unknown';
    const { cycleTheme } = await buildComposable();
    cycleTheme();
    expect(mockColorMode.preference).toBe('light');
  });

  it('calls track via setTheme when cycling', async () => {
    mockColorMode.preference = 'system';
    const { cycleTheme } = await buildComposable();
    cycleTheme();
    expect(mockTrack).toHaveBeenCalledWith('theme_toggled', { from: 'system', to: 'light' });
  });
});
