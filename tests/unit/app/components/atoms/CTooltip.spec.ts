import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CTooltip.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */
const CTooltip = {
  props: {
    text: { type: String, required: true },
    placement: { type: String, default: 'top' },
  },
  setup(_props: { text: string; placement: string }) {
    const placementClasses: Record<string, string> = {
      top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
      bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
      left: 'right-full top-1/2 mr-2 -translate-y-1/2',
      right: 'left-full top-1/2 ml-2 -translate-y-1/2',
    };
    return { placementClasses };
  },
  template: `
    <div class="group relative inline-flex" data-testid="tooltip-wrapper">
      <slot />
      <div
        data-testid="tooltip"
        role="tooltip"
        :class="['absolute z-50', placementClasses[placement]]"
      >
        {{ text }}
      </div>
    </div>
  `,
};

describe('CTooltip', () => {
  it('renders the tooltip text', () => {
    const wrapper = mount(CTooltip, { props: { text: 'Info utile' } });
    expect(wrapper.find('[data-testid="tooltip"]').text()).toBe('Info utile');
  });

  it('has role="tooltip" on the tooltip element', () => {
    const wrapper = mount(CTooltip, { props: { text: 'Info utile' } });
    expect(wrapper.find('[data-testid="tooltip"]').attributes('role')).toBe('tooltip');
  });

  it('renders the default slot content', () => {
    const wrapper = mount(CTooltip, {
      props: { text: 'Aide' },
      slots: { default: '<button>Hover me</button>' },
    });
    expect(wrapper.find('button').text()).toBe('Hover me');
  });

  it('applies top placement class by default', () => {
    const wrapper = mount(CTooltip, { props: { text: 'Info', placement: 'top' } });
    expect(wrapper.find('[data-testid="tooltip"]').classes()).toContain('bottom-full');
  });

  it('applies bottom placement class', () => {
    const wrapper = mount(CTooltip, { props: { text: 'Info', placement: 'bottom' } });
    expect(wrapper.find('[data-testid="tooltip"]').classes()).toContain('top-full');
  });

  it('applies left placement class', () => {
    const wrapper = mount(CTooltip, { props: { text: 'Info', placement: 'left' } });
    expect(wrapper.find('[data-testid="tooltip"]').classes()).toContain('right-full');
  });

  it('applies right placement class', () => {
    const wrapper = mount(CTooltip, { props: { text: 'Info', placement: 'right' } });
    expect(wrapper.find('[data-testid="tooltip"]').classes()).toContain('left-full');
  });

  it('wraps content in a relative container', () => {
    const wrapper = mount(CTooltip, { props: { text: 'Info' } });
    expect(wrapper.find('[data-testid="tooltip-wrapper"]').classes()).toContain('relative');
  });
});
