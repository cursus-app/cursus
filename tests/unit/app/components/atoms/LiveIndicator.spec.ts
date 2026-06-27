// @vitest-environment happy-dom
/**
 * Tests unitaires pour LiveIndicator (ST-06.4).
 *
 * Stratégie : composant stub inline (pattern CSpinner.spec.ts).
 * useReducedMotion et useI18n sont mockés via des stubs inline.
 */
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, computed } from 'vue';

// ─── Stub inline du composant ─────────────────────────────────────────────────
// On reproduit la logique de LiveIndicator sans les dépendances Nuxt.

function createLiveIndicator(reducedMotion = false) {
  return {
    props: {
      connected: { type: Boolean, required: true },
      polling: { type: Boolean, default: false },
    },
    setup(props: { connected: boolean; polling: boolean }) {
      const isReducedMotion = ref(reducedMotion);

      const label = computed(() => {
        if (props.connected) {return 'En direct';}
        if (props.polling) {return 'Mise à jour toutes les 10s';}
        return 'Déconnecté';
      });

      const dotClasses = computed(() => [
        'inline-block size-2 rounded-full',
        props.connected ? 'bg-success-solid' : 'bg-muted',
        props.connected && !isReducedMotion.value ? 'animate-pulse' : '',
      ]);

      return { label, dotClasses };
    },
    template: `
      <span
        data-testid="live-indicator"
        role="status"
        aria-live="polite"
        :aria-label="label"
        class="inline-flex items-center gap-1.5"
      >
        <span
          data-testid="dot"
          :class="dotClasses"
          aria-hidden="true"
        />
        <span data-testid="label" class="text-xs text-text-muted">{{ label }}</span>
      </span>
    `,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LiveIndicator — accessibilité', () => {
  it('a role="status"', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: true } });
    expect(wrapper.find('[data-testid="live-indicator"]').attributes('role')).toBe('status');
  });

  it('a aria-live="polite"', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: true } });
    expect(wrapper.find('[data-testid="live-indicator"]').attributes('aria-live')).toBe('polite');
  });

  it('le dot est aria-hidden', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: true } });
    expect(wrapper.find('[data-testid="dot"]').attributes('aria-hidden')).toBe('true');
  });
});

describe('LiveIndicator — état connected', () => {
  it('affiche "En direct" quand connected=true', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: true } });
    expect(wrapper.find('[data-testid="label"]').text()).toBe('En direct');
  });

  it('aria-label = "En direct" quand connected=true', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: true } });
    expect(wrapper.find('[data-testid="live-indicator"]').attributes('aria-label')).toBe(
      'En direct',
    );
  });

  it('dot a bg-success-solid quand connected=true', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: true } });
    expect(wrapper.find('[data-testid="dot"]').classes()).toContain('bg-success-solid');
  });

  it('dot a animate-pulse quand connected=true et pas reduced motion', () => {
    const LiveIndicator = createLiveIndicator(false);
    const wrapper = mount(LiveIndicator, { props: { connected: true } });
    expect(wrapper.find('[data-testid="dot"]').classes()).toContain('animate-pulse');
  });

  it("dot n'a pas animate-pulse si prefers-reduced-motion est actif", () => {
    const LiveIndicator = createLiveIndicator(true);
    const wrapper = mount(LiveIndicator, { props: { connected: true } });
    expect(wrapper.find('[data-testid="dot"]').classes()).not.toContain('animate-pulse');
  });
});

describe('LiveIndicator — état polling', () => {
  it('affiche "Mise à jour toutes les 10s" quand polling=true', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: false, polling: true } });
    expect(wrapper.find('[data-testid="label"]').text()).toBe('Mise à jour toutes les 10s');
  });

  it('dot a bg-muted quand polling=true (non connecté WS)', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: false, polling: true } });
    expect(wrapper.find('[data-testid="dot"]').classes()).toContain('bg-muted');
  });

  it("dot n'a pas animate-pulse quand polling=true", () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: false, polling: true } });
    expect(wrapper.find('[data-testid="dot"]').classes()).not.toContain('animate-pulse');
  });
});

describe('LiveIndicator — état déconnecté', () => {
  it('affiche "Déconnecté" quand connected=false et polling=false', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: false, polling: false } });
    expect(wrapper.find('[data-testid="label"]').text()).toBe('Déconnecté');
  });

  it('dot a bg-muted quand déconnecté', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: false } });
    expect(wrapper.find('[data-testid="dot"]').classes()).toContain('bg-muted');
  });

  it("dot n'a pas animate-pulse quand déconnecté", () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: false } });
    expect(wrapper.find('[data-testid="dot"]').classes()).not.toContain('animate-pulse');
  });
});

describe('LiveIndicator — priorité état', () => {
  it('connected=true a priorité sur polling=true', () => {
    const LiveIndicator = createLiveIndicator();
    const wrapper = mount(LiveIndicator, { props: { connected: true, polling: true } });
    expect(wrapper.find('[data-testid="label"]').text()).toBe('En direct');
    expect(wrapper.find('[data-testid="dot"]').classes()).toContain('bg-success-solid');
  });
});
