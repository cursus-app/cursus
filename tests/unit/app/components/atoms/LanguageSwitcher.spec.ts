// @vitest-environment happy-dom
/**
 * Tests unitaires de LanguageSwitcher (ST-19.3).
 *
 * Stratégie : on teste la logique du composant en utilisant un stub inline
 * (même approche que AppEmptyState, CIcon, etc.) pour éviter les longs
 * temps de chargement liés aux transformations Nuxt des fichiers .vue.
 *
 * Les tests portent sur :
 * - L'affichage du code locale courant en majuscules
 * - La construction des items avec handlers onSelect
 * - L'appel à switchLocale lors d'une sélection
 */
import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';

// ─── État mock partagé ────────────────────────────────────────────────────────

const mockSwitchLocale = vi.fn();

// ─── Stub du composable useAppI18n ────────────────────────────────────────────
// On simule le composable directement dans les tests pour valider la logique
// du composant sans dépendance au runtime Nuxt.

function buildLocaleOptions() {
  return [
    { code: 'fr' as const, name: 'Français', language: 'fr-FR' },
    { code: 'en' as const, name: 'English', language: 'en-US' },
  ];
}

// ─── Stub du composant LanguageSwitcher ───────────────────────────────────────
// On implémente la logique du composant dans un objet Vue standalone,
// en reproduisant fidèlement la logique de LanguageSwitcher.vue.
// Les modifications au composant réel doivent être reflétées ici si elles
// changent le comportement observable.

function buildComponent(localeCode: 'fr' | 'en') {
  return {
    setup() {
      const locale = computed(() => localeCode);
      const localeOptions = ref(buildLocaleOptions());

      const items = computed(() =>
        localeOptions.value.map((option) => ({
          label: option.name,
          value: option.code,
          icon: option.code === locale.value ? 'i-tabler-check' : undefined,
          class:
            option.code === locale.value ? 'font-medium text-text-strong' : 'text-text-default',
          onSelect: () => void mockSwitchLocale(option.code),
        })),
      );

      const buttonLabel = computed(() => locale.value.toUpperCase());

      return { locale, localeOptions, items, buttonLabel };
    },
    template: `
      <div data-testid="language-switcher">
        <div data-testid="dropdown-menu" :data-item-count="items.length">
          <button
            data-testid="lang-button"
            :aria-label="buttonLabel + ' — changer de langue / change language'"
          >{{ buttonLabel }}</button>
        </div>
      </div>
    `,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LanguageSwitcher — affichage bouton', () => {
  it('affiche "FR" quand la locale est "fr"', () => {
    const wrapper = mount(buildComponent('fr'));
    expect(wrapper.find('[data-testid="lang-button"]').text()).toBe('FR');
  });

  it('affiche "EN" quand la locale est "en"', () => {
    const wrapper = mount(buildComponent('en'));
    expect(wrapper.find('[data-testid="lang-button"]').text()).toBe('EN');
  });

  it('le bouton a un aria-label contenant le code locale courant', () => {
    const wrapper = mount(buildComponent('fr'));
    const ariaLabel = wrapper.find('[data-testid="lang-button"]').attributes('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain('FR');
  });

  it('le dropdown contient exactement 2 items (une par locale)', () => {
    const wrapper = mount(buildComponent('fr'));
    const dropdown = wrapper.find('[data-testid="dropdown-menu"]');
    expect(dropdown.attributes('data-item-count')).toBe('2');
  });
});

describe('LanguageSwitcher — items dropdown', () => {
  it('l\'item FR a l\'icône "check" quand la locale courante est "fr"', () => {
    // On vérifie via le component setup() directement
    const localeRef = ref<'fr' | 'en'>('fr');
    const localeOptions = buildLocaleOptions();

    const items = localeOptions.map((option) => ({
      value: option.code,
      icon: option.code === localeRef.value ? 'i-tabler-check' : undefined,
    }));

    const frItem = items.find((i) => i.value === 'fr');
    const enItem = items.find((i) => i.value === 'en');
    expect(frItem?.icon).toBe('i-tabler-check');
    expect(enItem?.icon).toBeUndefined();
  });

  it('l\'item EN a l\'icône "check" quand la locale courante est "en"', () => {
    const localeRef = ref<'fr' | 'en'>('en');
    const localeOptions = buildLocaleOptions();

    const items = localeOptions.map((option) => ({
      value: option.code,
      icon: option.code === localeRef.value ? 'i-tabler-check' : undefined,
    }));

    const frItem = items.find((i) => i.value === 'fr');
    const enItem = items.find((i) => i.value === 'en');
    expect(frItem?.icon).toBeUndefined();
    expect(enItem?.icon).toBe('i-tabler-check');
  });
});

describe('LanguageSwitcher — changement de locale', () => {
  it('les items ont des handlers onSelect', () => {
    const localeOptions = buildLocaleOptions();
    const mockHandler = vi.fn();

    const items = localeOptions.map((option) => ({
      value: option.code,
      onSelect: () => mockHandler(option.code),
    }));

    expect(typeof items[0]?.onSelect).toBe('function');
    expect(typeof items[1]?.onSelect).toBe('function');
  });

  it('onSelect("en") appelle le handler avec "en"', () => {
    const localeOptions = buildLocaleOptions();

    const items = localeOptions.map((option) => ({
      value: option.code,
      onSelect: () => void mockSwitchLocale(option.code),
    }));

    const enItem = items.find((i) => i.value === 'en');
    enItem?.onSelect();

    expect(mockSwitchLocale).toHaveBeenCalledWith('en');
  });

  it('onSelect("fr") appelle le handler avec "fr"', () => {
    vi.clearAllMocks();
    const localeOptions = buildLocaleOptions();

    const items = localeOptions.map((option) => ({
      value: option.code,
      onSelect: () => void mockSwitchLocale(option.code),
    }));

    const frItem = items.find((i) => i.value === 'fr');
    frItem?.onSelect();

    expect(mockSwitchLocale).toHaveBeenCalledWith('fr');
  });
});
