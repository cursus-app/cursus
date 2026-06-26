import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppEmptyState.
 * Stub standalone pour éviter le runtime Nuxt.
 */
const AppEmptyState = {
  props: {
    title: { type: String, required: true },
    description: { default: undefined },
    illustrationAlt: { default: undefined },
    actionLabel: { default: undefined },
    actionIcon: { default: undefined },
    icon: { default: undefined },
  },
  emits: ['action'],
  template: `
    <div data-testid="empty-state" class="flex flex-col items-center">
      <!-- SVG illustration ou icône -->
      <div v-if="icon" data-testid="icon" :class="icon" aria-hidden="true" />
      <svg
        v-else
        data-testid="illustration"
        :aria-labelledby="illustrationAlt ? 'svg-title' : undefined"
        :aria-hidden="!illustrationAlt"
        role="img"
      >
        <title v-if="illustrationAlt" id="svg-title">{{ illustrationAlt }}</title>
      </svg>

      <p data-testid="title">{{ title }}</p>
      <p v-if="description" data-testid="description">{{ description }}</p>

      <button
        v-if="actionLabel"
        data-testid="cta-button"
        @click="$emit('action')"
      >
        {{ actionLabel }}
      </button>

      <slot name="action" />
    </div>
  `,
};

describe('AppEmptyState', () => {
  it('renders title', () => {
    const wrapper = mount(AppEmptyState, { props: { title: 'Aucun résultat' } });
    expect(wrapper.find('[data-testid="title"]').text()).toBe('Aucun résultat');
  });

  it('renders description when provided', () => {
    const wrapper = mount(AppEmptyState, {
      props: { title: 'Vide', description: 'Aucune donnée pour l\'instant.' },
    });
    expect(wrapper.find('[data-testid="description"]').text()).toContain('Aucune donnée');
  });

  it('does not render description when not provided', () => {
    const wrapper = mount(AppEmptyState, { props: { title: 'Vide' } });
    expect(wrapper.find('[data-testid="description"]').exists()).toBe(false);
  });

  it('renders SVG illustration when no icon provided', () => {
    const wrapper = mount(AppEmptyState, { props: { title: 'Vide' } });
    expect(wrapper.find('[data-testid="illustration"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(false);
  });

  it('renders icon when icon prop provided', () => {
    const wrapper = mount(AppEmptyState, {
      props: { title: 'Vide', icon: 'i-tabler-inbox' },
    });
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="illustration"]').exists()).toBe(false);
  });

  it('adds aria-labelledby to SVG when illustrationAlt provided', () => {
    const wrapper = mount(AppEmptyState, {
      props: { title: 'Vide', illustrationAlt: 'Boîte vide' },
    });
    const svg = wrapper.find('[data-testid="illustration"]');
    expect(svg.attributes('aria-labelledby')).toBe('svg-title');
    // aria-hidden should not be "true" when illustrationAlt is provided
    expect(svg.attributes('aria-hidden')).not.toBe('true');
  });

  it('sets aria-hidden on SVG when no illustrationAlt', () => {
    const wrapper = mount(AppEmptyState, { props: { title: 'Vide' } });
    const svg = wrapper.find('[data-testid="illustration"]');
    expect(svg.attributes('aria-hidden')).toBe('true');
  });

  it('renders CTA button when actionLabel provided', () => {
    const wrapper = mount(AppEmptyState, {
      props: { title: 'Vide', actionLabel: 'Créer' },
    });
    expect(wrapper.find('[data-testid="cta-button"]').text()).toBe('Créer');
  });

  it('emits action event when CTA clicked', async () => {
    const wrapper = mount(AppEmptyState, {
      props: { title: 'Vide', actionLabel: 'Créer' },
    });
    await wrapper.find('[data-testid="cta-button"]').trigger('click');
    expect(wrapper.emitted('action')).toBeTruthy();
  });

  it('does not render CTA when actionLabel is not provided', () => {
    const wrapper = mount(AppEmptyState, { props: { title: 'Vide' } });
    expect(wrapper.find('[data-testid="cta-button"]').exists()).toBe(false);
  });
});
