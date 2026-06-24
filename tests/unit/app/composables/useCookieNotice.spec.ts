/**
 * Tests unitaires pour useCookieNotice — ST-15.5
 *
 * Stratégie :
 *  - L'environnement happy-dom avec @nuxt/test-utils fournit useCookie via
 *    le runtime Nuxt. On mock `#app/composables/cookie` (source réelle de
 *    useCookie dans Nuxt) pour contrôler la valeur du cookie par test.
 *  - On utilise vi.resetModules() + import dynamique dans chaque test pour
 *    s'assurer que le composable est ré-évalué avec le mock en place.
 */
import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';

// ─── Mock de #app/composables/cookie ─────────────────────────────────────────
// useCookie est exporté depuis ce module et ré-exporté via #imports.
const useCookieSpy = vi.fn();

vi.mock('#app/composables/cookie', () => ({
  useCookie: useCookieSpy,
  refreshCookie: vi.fn(),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useCookieNotice', () => {
  it('isVisible est true quand le cookie est absent (undefined)', async () => {
    vi.resetModules();
    const cookieRef = ref<'1' | undefined>(undefined);
    useCookieSpy.mockReturnValue(cookieRef);

    const { useCookieNotice } = await import('~/composables/useCookieNotice');
    const { isVisible } = useCookieNotice();

    expect(isVisible.value).toBe(true);
  });

  it("isVisible est false quand le cookie vaut '1'", async () => {
    vi.resetModules();
    const cookieRef = ref<'1' | undefined>('1');
    useCookieSpy.mockReturnValue(cookieRef);

    const { useCookieNotice } = await import('~/composables/useCookieNotice');
    const { isVisible } = useCookieNotice();

    expect(isVisible.value).toBe(false);
  });

  it("dismiss() pose le cookie à '1' et rend isVisible false", async () => {
    vi.resetModules();
    const cookieRef = ref<'1' | undefined>(undefined);
    useCookieSpy.mockReturnValue(cookieRef);

    const { useCookieNotice } = await import('~/composables/useCookieNotice');
    const { isVisible, dismiss } = useCookieNotice();

    expect(isVisible.value).toBe(true);

    dismiss();

    expect(cookieRef.value).toBe('1');
    expect(isVisible.value).toBe(false);
  });

  it('useCookie est appelé avec la bonne clé et les bonnes options (1 an, SameSite=Lax)', async () => {
    vi.resetModules();
    useCookieSpy.mockReturnValue(ref<'1' | undefined>(undefined));

    const { useCookieNotice } = await import('~/composables/useCookieNotice');
    useCookieNotice();

    expect(useCookieSpy).toHaveBeenCalledWith('cursus.cookie_notice_seen', {
      maxAge: 365 * 24 * 3600,
      sameSite: 'lax',
    });
  });

  it('maxAge correspond exactement à 365 jours en secondes (31 536 000)', async () => {
    vi.resetModules();
    useCookieSpy.mockReturnValue(ref<'1' | undefined>(undefined));

    const { useCookieNotice } = await import('~/composables/useCookieNotice');
    useCookieNotice();

    const callArgs = useCookieSpy.mock.calls[0];
    const options = callArgs?.[1] as { maxAge: number; sameSite: string } | undefined;
    expect(options).toBeDefined();
    expect(options?.maxAge).toBe(31_536_000);
    expect(options?.sameSite).toBe('lax');
  });

  it('retourne isVisible (computed) et dismiss (function)', async () => {
    vi.resetModules();
    useCookieSpy.mockReturnValue(ref<'1' | undefined>(undefined));

    const { useCookieNotice } = await import('~/composables/useCookieNotice');
    const result = useCookieNotice();

    expect(result).toHaveProperty('isVisible');
    expect(result).toHaveProperty('dismiss');
    expect(typeof result.dismiss).toBe('function');
    // isVisible est un computed (objet avec .value)
    expect(result.isVisible).toHaveProperty('value');
  });
});
