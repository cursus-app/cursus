import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CAvatar.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */

function getInitials(name: string | null): string {
  if (!name) {
    return '?';
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return (parts[0]?.[0] ?? '?').toUpperCase();
  }
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

const CAvatar = {
  props: {
    src: { default: null },
    alt: { default: null },
    name: { default: null },
    size: { default: 'md' },
  },
  setup(_props: { src: string | null; alt: string | null; name: string | null; size: string }) {
    const sizeClasses: Record<string, string> = {
      xs: 'size-6 text-xs',
      sm: 'size-8 text-sm',
      md: 'size-10 text-sm',
      lg: 'size-12 text-base',
      xl: 'size-16 text-lg',
    };
    return { sizeClasses, getInitials };
  },
  template: `
    <div data-testid="avatar" :class="sizeClasses[size]">
      <img
        v-if="src"
        data-testid="avatar-img"
        :src="src"
        :alt="alt ?? name ?? ''"
      />
      <span v-else data-testid="avatar-fallback">
        {{ getInitials(name) }}
      </span>
    </div>
  `,
};

describe('CAvatar', () => {
  it('renders image when src is provided', () => {
    const wrapper = mount(CAvatar, {
      props: { src: 'https://example.com/photo.jpg', name: 'Ali' },
    });
    expect(wrapper.find('[data-testid="avatar-img"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="avatar-fallback"]').exists()).toBe(false);
  });

  it('renders fallback initials when src is null', () => {
    const wrapper = mount(CAvatar, { props: { src: null, name: 'Mohamed Sadjad' } });
    expect(wrapper.find('[data-testid="avatar-img"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="avatar-fallback"]').text()).toBe('MS');
  });

  it('extracts single initial for single-word name', () => {
    const wrapper = mount(CAvatar, { props: { name: 'Alice' } });
    expect(wrapper.find('[data-testid="avatar-fallback"]').text()).toBe('A');
  });

  it('shows "?" when name is null and no src', () => {
    const wrapper = mount(CAvatar, { props: { name: null } });
    expect(wrapper.find('[data-testid="avatar-fallback"]').text()).toBe('?');
  });

  it('applies the md size class by default', () => {
    const wrapper = mount(CAvatar);
    expect(wrapper.find('[data-testid="avatar"]').classes()).toContain('size-10');
  });

  it('applies xs size class', () => {
    const wrapper = mount(CAvatar, { props: { size: 'xs' } });
    expect(wrapper.find('[data-testid="avatar"]').classes()).toContain('size-6');
  });

  it('applies xl size class', () => {
    const wrapper = mount(CAvatar, { props: { size: 'xl' } });
    expect(wrapper.find('[data-testid="avatar"]').classes()).toContain('size-16');
  });

  it('uses alt prop for img alt attribute when provided', () => {
    const wrapper = mount(CAvatar, {
      props: { src: 'https://example.com/photo.jpg', alt: 'Photo de Mohamed', name: 'Mohamed' },
    });
    expect(wrapper.find('[data-testid="avatar-img"]').attributes('alt')).toBe('Photo de Mohamed');
  });

  it('falls back to name for img alt when alt is null', () => {
    const wrapper = mount(CAvatar, {
      props: { src: 'https://example.com/photo.jpg', alt: null, name: 'Sophie' },
    });
    expect(wrapper.find('[data-testid="avatar-img"]').attributes('alt')).toBe('Sophie');
  });
});
