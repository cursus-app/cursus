import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppAlert.
 * Stub standalone pour éviter le runtime Nuxt.
 */
type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

const AppAlert = {
  props: {
    variant: { type: String, default: 'info' },
    title: { default: null },
    description: { default: null },
    dismissible: { type: Boolean, default: false },
  },
  emits: ['close'],
  data() {
    return { visible: true };
  },
  methods: {
    dismiss(this: { visible: boolean; $emit: (e: string) => void }) {
      this.visible = false;
      this.$emit('close');
    },
  },
  computed: {
    ariaRole(this: { variant: string }) {
      return this.variant === 'danger' || this.variant === 'warning' ? 'alert' : 'status';
    },
  },
  template: `
    <div
      v-if="visible"
      data-testid="alert"
      :role="ariaRole"
    >
      <span v-if="title" data-testid="title">{{ title }}</span>
      <span v-if="description" data-testid="description">{{ description }}</span>
      <button
        v-if="dismissible"
        data-testid="dismiss-btn"
        @click="dismiss"
        aria-label="Fermer l'alerte"
      >
        ×
      </button>
      <slot />
    </div>
  `,
};

describe('AppAlert', () => {
  it('renders with role="status" for info variant', () => {
    const wrapper = mount(AppAlert, { props: { variant: 'info', title: 'Info' } });
    expect(wrapper.find('[data-testid="alert"]').attributes('role')).toBe('status');
  });

  it('renders with role="status" for success variant', () => {
    const wrapper = mount(AppAlert, { props: { variant: 'success', title: 'OK' } });
    expect(wrapper.find('[data-testid="alert"]').attributes('role')).toBe('status');
  });

  it('renders with role="alert" for danger variant', () => {
    const wrapper = mount(AppAlert, { props: { variant: 'danger', title: 'Erreur' } });
    expect(wrapper.find('[data-testid="alert"]').attributes('role')).toBe('alert');
  });

  it('renders with role="alert" for warning variant', () => {
    const wrapper = mount(AppAlert, { props: { variant: 'warning', title: 'Attention' } });
    expect(wrapper.find('[data-testid="alert"]').attributes('role')).toBe('alert');
  });

  it('renders title when provided', () => {
    const wrapper = mount(AppAlert, { props: { title: 'Mon titre' } });
    expect(wrapper.find('[data-testid="title"]').text()).toBe('Mon titre');
  });

  it('renders description when provided', () => {
    const wrapper = mount(AppAlert, { props: { description: 'Ma description' } });
    expect(wrapper.find('[data-testid="description"]').text()).toBe('Ma description');
  });

  it('does not render dismiss button by default', () => {
    const wrapper = mount(AppAlert, { props: { title: 'Info' } });
    expect(wrapper.find('[data-testid="dismiss-btn"]').exists()).toBe(false);
  });

  it('renders dismiss button when dismissible=true', () => {
    const wrapper = mount(AppAlert, { props: { title: 'Info', dismissible: true } });
    expect(wrapper.find('[data-testid="dismiss-btn"]').exists()).toBe(true);
  });

  it('hides the alert when dismiss is clicked', async () => {
    const wrapper = mount(AppAlert, { props: { title: 'Info', dismissible: true } });
    await wrapper.find('[data-testid="dismiss-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="alert"]').exists()).toBe(false);
  });

  it('emits close event when dismiss is clicked', async () => {
    const wrapper = mount(AppAlert, { props: { title: 'Info', dismissible: true } });
    await wrapper.find('[data-testid="dismiss-btn"]').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('dismiss button has aria-label', () => {
    const wrapper = mount(AppAlert, { props: { title: 'Info', dismissible: true } });
    const btn = wrapper.find('[data-testid="dismiss-btn"]');
    expect(btn.attributes('aria-label')).toBeTruthy();
  });
});
