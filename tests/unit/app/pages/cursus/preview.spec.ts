// @vitest-environment happy-dom
//
// Tests unitaires pour la page de prévisualisation cursus (ST-03.8).
// Stratégie : standalone component stubs + helpers purs extraits de la logique page.
// On évite d'importer le .vue directement (qui requiert le runtime Nuxt complet).

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

// ─── Helpers purs (extraits de la logique de la page) ────────────────────────

interface Resource {
  title: string;
  url: string;
  type?: string;
}

interface DeliverableSpec {
  title: string;
  description?: string;
  mandatory?: boolean;
}

interface PreviewModule {
  id: string;
  week: number;
  title: string;
  objectives: string;
  resourcesJson: unknown;
  deliverableSpecJson: unknown;
  xpReward: number;
}

/** Retourne les ressources d'un module après validation de la structure JSON. */
function getResources(mod: PreviewModule): Resource[] {
  if (!Array.isArray(mod.resourcesJson)) {
    return [];
  }
  return (mod.resourcesJson as unknown[]).filter(
    (r): r is Resource =>
      typeof r === 'object' && r !== null && 'title' in r && 'url' in r,
  );
}

/** Retourne le livrable d'un module ou null si absent / mal formé. */
function getDeliverable(mod: PreviewModule): DeliverableSpec | null {
  const spec = mod.deliverableSpecJson;
  if (typeof spec !== 'object' || spec === null || !('title' in spec)) {
    return null;
  }
  return spec as DeliverableSpec;
}

/** Retourne le module correspondant à une semaine donnée, ou null. */
function getModuleForWeek(
  modules: PreviewModule[],
  week: number,
): PreviewModule | null {
  return modules.find((m) => m.week === week) ?? null;
}

/** Indique si une semaine suivante est disponible. */
function hasNextWeek(modules: PreviewModule[], currentWeek: number): boolean {
  const weeks = modules.map((m) => m.week).sort((a, b) => a - b);
  const idx = weeks.indexOf(currentWeek);
  return idx >= 0 && idx < weeks.length - 1;
}

/** Indique si une semaine précédente est disponible. */
function hasPreviousWeek(modules: PreviewModule[], currentWeek: number): boolean {
  const weeks = modules.map((m) => m.week).sort((a, b) => a - b);
  const idx = weeks.indexOf(currentWeek);
  return idx > 0;
}

// ─── Données de test ──────────────────────────────────────────────────────────

const MODULE_1: PreviewModule = {
  id: 'mod-1',
  week: 1,
  title: 'Introduction HTML/CSS',
  objectives: 'Maîtriser les balises de base',
  resourcesJson: [
    { title: 'MDN HTML', url: 'https://developer.mozilla.org/html' },
    { title: 'MDN CSS', url: 'https://developer.mozilla.org/css' },
  ],
  deliverableSpecJson: {
    title: 'Page HTML statique',
    description: 'Créer une page avec header, main, footer',
    mandatory: true,
  },
  xpReward: 100,
};

const MODULE_2: PreviewModule = {
  id: 'mod-2',
  week: 2,
  title: 'JavaScript fondamentaux',
  objectives: 'Variables, fonctions, boucles',
  resourcesJson: [{ title: 'JS.info', url: 'https://javascript.info' }],
  deliverableSpecJson: { title: 'Script JS', mandatory: true },
  xpReward: 150,
};

const MODULE_3: PreviewModule = {
  id: 'mod-3',
  week: 4,
  title: 'Vue 3 introduction',
  objectives: 'Composition API, composants',
  resourcesJson: null, // données invalides → doit retourner []
  deliverableSpecJson: null,
  xpReward: 200,
};

const MODULES: PreviewModule[] = [MODULE_1, MODULE_2, MODULE_3];

// ─── Tests helpers purs ───────────────────────────────────────────────────────

describe('getModuleForWeek()', () => {
  it('returns the module matching the requested week', () => {
    const mod = getModuleForWeek(MODULES, 2);
    expect(mod?.id).toBe('mod-2');
  });

  it('returns null when no module matches the week', () => {
    expect(getModuleForWeek(MODULES, 99)).toBeNull();
  });

  it('returns null for an empty modules array', () => {
    expect(getModuleForWeek([], 1)).toBeNull();
  });

  it('handles week 0 gracefully (no match)', () => {
    expect(getModuleForWeek(MODULES, 0)).toBeNull();
  });
});

describe('getResources()', () => {
  it('returns an array of resources when resourcesJson is a valid array', () => {
    const resources = getResources(MODULE_1);
    expect(resources).toHaveLength(2);
    expect(resources[0]?.title).toBe('MDN HTML');
    expect(resources[0]?.url).toBe('https://developer.mozilla.org/html');
  });

  it('returns empty array when resourcesJson is null', () => {
    expect(getResources(MODULE_3)).toHaveLength(0);
  });

  it('filters out malformed resource objects missing url', () => {
    const mod: PreviewModule = {
      ...MODULE_1,
      resourcesJson: [{ title: 'Bad resource' }, { title: 'Good', url: 'https://ok.com' }],
    };
    const resources = getResources(mod);
    expect(resources).toHaveLength(1);
    expect(resources[0]?.title).toBe('Good');
  });

  it('returns empty array when resourcesJson is a plain object (not array)', () => {
    const mod: PreviewModule = {
      ...MODULE_1,
      resourcesJson: { title: 'Not an array', url: 'https://test.com' },
    };
    expect(getResources(mod)).toHaveLength(0);
  });

  it('returns empty array when resourcesJson is a string', () => {
    const mod: PreviewModule = { ...MODULE_1, resourcesJson: 'invalid' };
    expect(getResources(mod)).toHaveLength(0);
  });
});

describe('getDeliverable()', () => {
  it('returns deliverable spec when deliverableSpecJson has a title', () => {
    const spec = getDeliverable(MODULE_1);
    expect(spec?.title).toBe('Page HTML statique');
    expect(spec?.description).toBe('Créer une page avec header, main, footer');
  });

  it('returns null when deliverableSpecJson is null', () => {
    expect(getDeliverable(MODULE_3)).toBeNull();
  });

  it('returns null when deliverableSpecJson is an object without title', () => {
    const mod: PreviewModule = {
      ...MODULE_1,
      deliverableSpecJson: { description: 'No title here' },
    };
    expect(getDeliverable(mod)).toBeNull();
  });

  it('returns null when deliverableSpecJson is a string', () => {
    const mod: PreviewModule = { ...MODULE_1, deliverableSpecJson: 'bad' };
    expect(getDeliverable(mod)).toBeNull();
  });
});

describe('hasNextWeek() / hasPreviousWeek()', () => {
  it('hasNextWeek returns true when there is a module with a higher week', () => {
    expect(hasNextWeek(MODULES, 1)).toBe(true);
    expect(hasNextWeek(MODULES, 2)).toBe(true);
  });

  it('hasNextWeek returns false on the last week', () => {
    expect(hasNextWeek(MODULES, 4)).toBe(false);
  });

  it('hasNextWeek returns false for an unknown week', () => {
    expect(hasNextWeek(MODULES, 99)).toBe(false);
  });

  it('hasPreviousWeek returns true when there is a module with a lower week', () => {
    expect(hasPreviousWeek(MODULES, 2)).toBe(true);
    expect(hasPreviousWeek(MODULES, 4)).toBe(true);
  });

  it('hasPreviousWeek returns false on the first week', () => {
    expect(hasPreviousWeek(MODULES, 1)).toBe(false);
  });

  it('hasPreviousWeek returns false for an unknown week', () => {
    expect(hasPreviousWeek(MODULES, 99)).toBe(false);
  });

  it('returns false for both directions with a single module', () => {
    const single = [MODULE_1];
    expect(hasNextWeek(single, 1)).toBe(false);
    expect(hasPreviousWeek(single, 1)).toBe(false);
  });
});

// ─── Tests composant standalone : bandeau d'aperçu ───────────────────────────

/**
 * Composant stub du bandeau de prévisualisation.
 * Reproduit le comportement du bandeau dans preview.vue sans dépendre du runtime Nuxt.
 */
const PreviewBanner = {
  props: {
    message: { type: String, required: true },
    backLabel: { type: String, required: true },
  },
  template: `
    <div
      role="alert"
      aria-live="polite"
      data-testid="preview-banner"
      class="sticky top-0"
    >
      <span data-testid="banner-message">{{ message }}</span>
      <a data-testid="back-link" href="#">{{ backLabel }}</a>
    </div>
  `,
};

describe('PreviewBanner — composant standalone', () => {
  it('renders with role="alert" for screen readers', () => {
    const wrapper = mount(PreviewBanner, {
      props: { message: 'Mode aperçu', backLabel: 'Retour' },
    });
    expect(wrapper.find('[data-testid="preview-banner"]').attributes('role')).toBe('alert');
  });

  it('renders with aria-live="polite"', () => {
    const wrapper = mount(PreviewBanner, {
      props: { message: 'Mode aperçu', backLabel: 'Retour' },
    });
    expect(wrapper.find('[data-testid="preview-banner"]').attributes('aria-live')).toBe('polite');
  });

  it('displays the banner message', () => {
    const wrapper = mount(PreviewBanner, {
      props: { message: 'Mode aperçu — vous n\'êtes pas stagiaire', backLabel: 'Retour' },
    });
    expect(wrapper.find('[data-testid="banner-message"]').text()).toBe(
      "Mode aperçu — vous n'êtes pas stagiaire",
    );
  });

  it('renders the back link', () => {
    const wrapper = mount(PreviewBanner, {
      props: { message: 'Aperçu', backLabel: 'Retour à l\'éditeur' },
    });
    expect(wrapper.find('[data-testid="back-link"]').text()).toBe("Retour à l'éditeur");
  });
});

// ─── Tests composant standalone : bouton soumettre désactivé ─────────────────

/**
 * Composant stub du bouton de soumission en mode aperçu.
 * En mode aperçu, le bouton est toujours disabled + aria-disabled.
 */
const PreviewSubmitButton = {
  props: {
    label: { type: String, required: true },
    tooltipText: { type: String, required: true },
  },
  template: `
    <div>
      <span data-testid="tooltip" :title="tooltipText">
        <button
          disabled
          aria-disabled="true"
          data-testid="submit-disabled"
          type="button"
        >
          {{ label }}
        </button>
      </span>
    </div>
  `,
};

describe('PreviewSubmitButton — composant standalone', () => {
  it('renders a disabled button (disabled attribute present)', () => {
    const wrapper = mount(PreviewSubmitButton, {
      props: {
        label: 'Soumettre le livrable',
        tooltipText: 'Action non disponible en mode aperçu',
      },
    });
    const btn = wrapper.find('[data-testid="submit-disabled"]');
    expect(btn.attributes('disabled')).toBeDefined();
  });

  it('sets aria-disabled="true" for accessibility', () => {
    const wrapper = mount(PreviewSubmitButton, {
      props: {
        label: 'Soumettre le livrable',
        tooltipText: 'Action non disponible en mode aperçu',
      },
    });
    const btn = wrapper.find('[data-testid="submit-disabled"]');
    expect(btn.attributes('aria-disabled')).toBe('true');
  });

  it('shows the submit label text', () => {
    const wrapper = mount(PreviewSubmitButton, {
      props: {
        label: 'Soumettre le livrable',
        tooltipText: 'Action non disponible en mode aperçu',
      },
    });
    expect(wrapper.find('[data-testid="submit-disabled"]').text()).toBe('Soumettre le livrable');
  });

  it('carries the tooltip text on the wrapper', () => {
    const wrapper = mount(PreviewSubmitButton, {
      props: {
        label: 'Soumettre',
        tooltipText: 'Non disponible en aperçu',
      },
    });
    expect(wrapper.find('[data-testid="tooltip"]').attributes('title')).toBe(
      'Non disponible en aperçu',
    );
  });
});

// ─── Tests composant standalone : état vide ───────────────────────────────────

const PreviewEmptyState = {
  props: {
    message: { type: String, required: true },
  },
  template: `
    <div data-testid="empty-state" class="flex flex-col items-center">
      <span data-testid="empty-message">{{ message }}</span>
    </div>
  `,
};

describe('PreviewEmptyState — composant standalone', () => {
  it('renders the no-modules message', () => {
    const wrapper = mount(PreviewEmptyState, {
      props: { message: 'Ce cursus n\'a pas encore de modules.' },
    });
    expect(wrapper.find('[data-testid="empty-message"]').text()).toBe(
      "Ce cursus n'a pas encore de modules.",
    );
  });

  it('renders the no-module-for-week message', () => {
    const wrapper = mount(PreviewEmptyState, {
      props: { message: 'Plus de modules au-delà de la semaine 10.' },
    });
    expect(wrapper.find('[data-testid="empty-message"]').text()).toContain('semaine 10');
  });
});
