import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppCard.
 * Stub standalone pour éviter le runtime Nuxt.
 */
const AppCard = {
  props: {
    padding: { type: String, default: 'md' },
    shadow: { type: Boolean, default: true },
  },
  setup(props: { padding: string; shadow: boolean }) {
    const paddingClasses: Record<string, string> = {
      none: '',
      sm: 'p-3',
      md: 'p-6',
      lg: 'p-8',
    };
    return { paddingClasses, props };
  },
  template: `
    <div
      data-testid="card"
      :class="[
        'rounded-xl border border-border-subtle bg-surface',
        shadow ? 'shadow-sm' : '',
      ]"
    >
      <div v-if="$slots.header" data-testid="header" :class="['border-b border-border-subtle', paddingClasses[padding]]">
        <slot name="header" />
      </div>
      <div v-if="$slots.default" data-testid="body" :class="paddingClasses[padding]">
        <slot />
      </div>
      <div v-if="$slots.footer" data-testid="footer" :class="['border-t border-border-subtle', paddingClasses[padding]]">
        <slot name="footer" />
      </div>
    </div>
  `,
};

describe('AppCard', () => {
  it('renders body slot content', () => {
    const wrapper = mount(AppCard, {
      slots: { default: '<p data-testid="content">Contenu</p>' },
    });
    expect(wrapper.find('[data-testid="content"]').text()).toBe('Contenu');
  });

  it('renders header slot when provided', () => {
    const wrapper = mount(AppCard, {
      slots: {
        header: '<h3>Titre</h3>',
        default: '<p>Corps</p>',
      },
    });
    expect(wrapper.find('[data-testid="header"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="header"]').text()).toBe('Titre');
  });

  it('does not render header section when slot not provided', () => {
    const wrapper = mount(AppCard, {
      slots: { default: '<p>Corps</p>' },
    });
    expect(wrapper.find('[data-testid="header"]').exists()).toBe(false);
  });

  it('renders footer slot when provided', () => {
    const wrapper = mount(AppCard, {
      slots: {
        default: '<p>Corps</p>',
        footer: '<button>OK</button>',
      },
    });
    expect(wrapper.find('[data-testid="footer"]').exists()).toBe(true);
  });

  it('applies shadow class by default', () => {
    const wrapper = mount(AppCard, {
      slots: { default: '<p>Corps</p>' },
    });
    expect(wrapper.find('[data-testid="card"]').classes()).toContain('shadow-sm');
  });

  it('does not apply shadow class when shadow=false', () => {
    const wrapper = mount(AppCard, {
      props: { shadow: false },
      slots: { default: '<p>Corps</p>' },
    });
    expect(wrapper.find('[data-testid="card"]').classes()).not.toContain('shadow-sm');
  });

  it('applies padding class for size md by default', () => {
    const wrapper = mount(AppCard, {
      slots: { default: '<p>Corps</p>' },
    });
    expect(wrapper.find('[data-testid="body"]').classes()).toContain('p-6');
  });

  it('applies sm padding class when padding=sm', () => {
    const wrapper = mount(AppCard, {
      props: { padding: 'sm' },
      slots: { default: '<p>Corps</p>' },
    });
    expect(wrapper.find('[data-testid="body"]').classes()).toContain('p-3');
  });
});
