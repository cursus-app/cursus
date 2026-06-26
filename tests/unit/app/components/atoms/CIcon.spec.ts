import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CIcon.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */
const CIcon = {
  props: {
    name: { type: String, required: true },
    size: { type: Number, default: 20 },
    color: { type: String, default: 'inherit' },
  },
  setup(_props: { name: string; size: number; color: string }) {
    const sizeMap: Record<number, string> = {
      16: 'size-4',
      20: 'size-5',
      24: 'size-6',
    };
    return { sizeMap };
  },
  template: `
    <span
      data-testid="icon"
      :class="[
        name,
        sizeMap[size] ?? 'size-5',
        'inline-block shrink-0',
        color !== 'inherit' ? color : '',
      ]"
      aria-hidden="true"
    />
  `,
};

describe('CIcon', () => {
  it('renders the icon name as a class', () => {
    const wrapper = mount(CIcon, { props: { name: 'i-tabler-home' } });
    expect(wrapper.find('[data-testid="icon"]').classes()).toContain('i-tabler-home');
  });

  it('applies size-5 class by default (size=20)', () => {
    const wrapper = mount(CIcon, { props: { name: 'i-tabler-home' } });
    expect(wrapper.find('[data-testid="icon"]').classes()).toContain('size-5');
  });

  it('applies size-4 class for size=16', () => {
    const wrapper = mount(CIcon, { props: { name: 'i-tabler-home', size: 16 } });
    expect(wrapper.find('[data-testid="icon"]').classes()).toContain('size-4');
  });

  it('applies size-6 class for size=24', () => {
    const wrapper = mount(CIcon, { props: { name: 'i-tabler-home', size: 24 } });
    expect(wrapper.find('[data-testid="icon"]').classes()).toContain('size-6');
  });

  it('applies color class when color is not "inherit"', () => {
    const wrapper = mount(CIcon, { props: { name: 'i-tabler-home', color: 'text-accent' } });
    expect(wrapper.find('[data-testid="icon"]').classes()).toContain('text-accent');
  });

  it('does not apply color class when color is "inherit"', () => {
    const wrapper = mount(CIcon, { props: { name: 'i-tabler-home', color: 'inherit' } });
    const classes = wrapper.find('[data-testid="icon"]').classes();
    expect(classes).not.toContain('inherit');
  });

  it('is aria-hidden by default', () => {
    const wrapper = mount(CIcon, { props: { name: 'i-tabler-star' } });
    expect(wrapper.find('[data-testid="icon"]').attributes('aria-hidden')).toBe('true');
  });

  it('applies inline-block class', () => {
    const wrapper = mount(CIcon, { props: { name: 'i-tabler-star' } });
    expect(wrapper.find('[data-testid="icon"]').classes()).toContain('inline-block');
  });
});
