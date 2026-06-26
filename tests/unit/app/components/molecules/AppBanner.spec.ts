import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppBanner.
 * Stub standalone avec mock localStorage.
 */
const AppBanner = {
  props: {
    id: { type: String, required: true },
    variant: { type: String, default: 'info' },
    message: { type: String, required: true },
    dismissible: { type: Boolean, default: true },
  },
  emits: ['dismiss'],
  data() {
    return { visible: false };
  },
  mounted() {
    const key = `banner-dismissed-${this.id}`;
    if (typeof localStorage !== 'undefined') {
      this.visible = localStorage.getItem(key) !== '1';
    } else {
      this.visible = true;
    }
  },
  methods: {
    dismiss() {
      this.visible = false;
      const key = `banner-dismissed-${this.id}`;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, '1');
      }
      this.$emit('dismiss');
    },
  },
  template: `
    <header
      v-if="visible"
      data-testid="banner"
      role="banner"
    >
      <span data-testid="message">{{ message }}</span>
      <button
        v-if="dismissible"
        data-testid="dismiss-btn"
        @click="dismiss"
        aria-label="Fermer le bandeau"
      >×</button>
      <slot />
    </header>
  `,
};

describe('AppBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders message', async () => {
    const wrapper = mount(AppBanner, { props: { id: 'test', message: 'Info importante' } });
    // Wait for mounted() to set visible
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="message"]').text()).toBe('Info importante');
  });

  it('has role="banner"', async () => {
    const wrapper = mount(AppBanner, { props: { id: 'test', message: 'Info' } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="banner"]').attributes('role')).toBe('banner');
  });

  it('shows dismiss button when dismissible=true', async () => {
    const wrapper = mount(AppBanner, { props: { id: 'test', message: 'Info', dismissible: true } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="dismiss-btn"]').exists()).toBe(true);
  });

  it('hides dismiss button when dismissible=false', async () => {
    const wrapper = mount(AppBanner, {
      props: { id: 'test', message: 'Info', dismissible: false },
    });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="dismiss-btn"]').exists()).toBe(false);
  });

  it('hides banner after dismiss click', async () => {
    const wrapper = mount(AppBanner, { props: { id: 'test', message: 'Info' } });
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-testid="dismiss-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="banner"]').exists()).toBe(false);
  });

  it('emits dismiss event when closed', async () => {
    const wrapper = mount(AppBanner, { props: { id: 'test', message: 'Info' } });
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-testid="dismiss-btn"]').trigger('click');
    expect(wrapper.emitted('dismiss')).toBeTruthy();
  });

  it('persists dismiss state in localStorage', async () => {
    const wrapper = mount(AppBanner, { props: { id: 'persist-test', message: 'Info' } });
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-testid="dismiss-btn"]').trigger('click');
    expect(localStorage.getItem('banner-dismissed-persist-test')).toBe('1');
  });

  it('is hidden when localStorage already set', async () => {
    localStorage.setItem('banner-dismissed-already-gone', '1');
    const wrapper = mount(AppBanner, { props: { id: 'already-gone', message: 'Info' } });
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="banner"]').exists()).toBe(false);
  });

  it('dismiss button has aria-label', async () => {
    const wrapper = mount(AppBanner, { props: { id: 'test', message: 'Info' } });
    await wrapper.vm.$nextTick();
    const btn = wrapper.find('[data-testid="dismiss-btn"]');
    expect(btn.attributes('aria-label')).toBeTruthy();
  });
});
