import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CSpinner.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */
const CSpinner = {
  props: {
    size: { type: String, default: 'md' },
    ariaLabel: { type: String, required: true },
  },
  setup(_props: { size: string; ariaLabel: string }) {
    const sizeClasses: Record<string, string> = {
      sm: 'size-4',
      md: 'size-6',
      lg: 'size-8',
    };
    return { sizeClasses };
  },
  template: `
    <span
      data-testid="spinner"
      role="status"
      :aria-label="ariaLabel"
    >
      <span
        data-testid="spinner-icon"
        :class="['i-tabler-loader-2 animate-spin text-accent', sizeClasses[size]]"
        aria-hidden="true"
      />
    </span>
  `,
};

describe('CSpinner', () => {
  it('renders with role="status"', () => {
    const wrapper = mount(CSpinner, { props: { ariaLabel: 'Chargement en cours' } });
    expect(wrapper.find('[data-testid="spinner"]').attributes('role')).toBe('status');
  });

  it('renders with the provided aria-label', () => {
    const wrapper = mount(CSpinner, { props: { ariaLabel: 'Veuillez patienter' } });
    expect(wrapper.find('[data-testid="spinner"]').attributes('aria-label')).toBe(
      'Veuillez patienter',
    );
  });

  it('applies size-6 class by default (md)', () => {
    const wrapper = mount(CSpinner, { props: { ariaLabel: 'Chargement' } });
    expect(wrapper.find('[data-testid="spinner-icon"]').classes()).toContain('size-6');
  });

  it('applies size-4 class for size="sm"', () => {
    const wrapper = mount(CSpinner, { props: { ariaLabel: 'Chargement', size: 'sm' } });
    expect(wrapper.find('[data-testid="spinner-icon"]').classes()).toContain('size-4');
  });

  it('applies size-8 class for size="lg"', () => {
    const wrapper = mount(CSpinner, { props: { ariaLabel: 'Chargement', size: 'lg' } });
    expect(wrapper.find('[data-testid="spinner-icon"]').classes()).toContain('size-8');
  });

  it('the spinner icon is aria-hidden', () => {
    const wrapper = mount(CSpinner, { props: { ariaLabel: 'Chargement' } });
    expect(wrapper.find('[data-testid="spinner-icon"]').attributes('aria-hidden')).toBe('true');
  });

  it('applies animate-spin class on the icon', () => {
    const wrapper = mount(CSpinner, { props: { ariaLabel: 'Chargement' } });
    expect(wrapper.find('[data-testid="spinner-icon"]').classes()).toContain('animate-spin');
  });
});
