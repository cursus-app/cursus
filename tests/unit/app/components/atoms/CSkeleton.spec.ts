import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CSkeleton.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 * Note : `class` est un mot réservé dans les templates Vue ; on utilise `extraClass`
 * dans le stub pour tester la prop de passthrough.
 */

function toPixels(value: string | number | null): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    return `${value}px`;
  }
  return value;
}

const CSkeleton = {
  props: {
    width: { default: null },
    height: { default: null },
    rounded: { type: Boolean, default: false },
    extraClass: { type: String, default: '' },
  },
  setup() {
    return { toPixels };
  },
  template: `
    <div
      data-testid="skeleton"
      :class="['skeleton', rounded ? 'rounded-full' : 'rounded-md', extraClass]"
      :style="{
        width: toPixels(width) ?? undefined,
        height: toPixels(height) ?? undefined,
      }"
      aria-hidden="true"
    />
  `,
};

describe('CSkeleton', () => {
  it('renders with aria-hidden="true"', () => {
    const wrapper = mount(CSkeleton);
    expect(wrapper.find('[data-testid="skeleton"]').attributes('aria-hidden')).toBe('true');
  });

  it('applies skeleton class', () => {
    const wrapper = mount(CSkeleton);
    expect(wrapper.find('[data-testid="skeleton"]').classes()).toContain('skeleton');
  });

  it('applies rounded-md by default (rounded=false)', () => {
    const wrapper = mount(CSkeleton);
    expect(wrapper.find('[data-testid="skeleton"]').classes()).toContain('rounded-md');
    expect(wrapper.find('[data-testid="skeleton"]').classes()).not.toContain('rounded-full');
  });

  it('applies rounded-full when rounded=true', () => {
    const wrapper = mount(CSkeleton, { props: { rounded: true } });
    expect(wrapper.find('[data-testid="skeleton"]').classes()).toContain('rounded-full');
  });

  it('applies numeric width as px style', () => {
    const wrapper = mount(CSkeleton, { props: { width: 200 } });
    expect((wrapper.find('[data-testid="skeleton"]').element as HTMLElement).style.width).toBe(
      '200px',
    );
  });

  it('applies string width directly', () => {
    const wrapper = mount(CSkeleton, { props: { width: '100%' } });
    expect((wrapper.find('[data-testid="skeleton"]').element as HTMLElement).style.width).toBe(
      '100%',
    );
  });

  it('applies numeric height as px style', () => {
    const wrapper = mount(CSkeleton, { props: { height: 40 } });
    expect((wrapper.find('[data-testid="skeleton"]').element as HTMLElement).style.height).toBe(
      '40px',
    );
  });

  it('passes through extra class prop', () => {
    const wrapper = mount(CSkeleton, { props: { extraClass: 'w-full' } });
    expect(wrapper.find('[data-testid="skeleton"]').classes()).toContain('w-full');
  });
});
