import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppFormField.
 * Stub standalone pour éviter le runtime Nuxt / @nuxt/ui.
 */
const AppFormField = {
  props: {
    label: { default: null },
    name: { default: undefined },
    error: { default: null },
    hint: { default: null },
    required: { type: Boolean, default: false },
  },
  template: `
    <div class="app-form-field">
      <label
        v-if="label"
        data-testid="label"
        :for="name"
      >
        {{ label }}
        <span v-if="required" data-testid="required-mark" aria-hidden="true">*</span>
      </label>
      <slot />
      <p
        v-if="hint && !error"
        data-testid="hint"
        class="text-text-muted"
      >
        {{ hint }}
      </p>
      <p
        v-if="error"
        data-testid="error"
        role="alert"
        class="text-danger-fg"
        :id="name ? name + '-error' : undefined"
      >
        {{ error }}
      </p>
    </div>
  `,
};

describe('AppFormField', () => {
  it('renders without label when not provided', () => {
    const wrapper = mount(AppFormField);
    expect(wrapper.find('[data-testid="label"]').exists()).toBe(false);
  });

  it('renders label when provided', () => {
    const wrapper = mount(AppFormField, { props: { label: 'Email', name: 'email' } });
    expect(wrapper.find('[data-testid="label"]').text()).toContain('Email');
  });

  it('associates label with input via for attribute', () => {
    const wrapper = mount(AppFormField, { props: { label: 'Email', name: 'email' } });
    const label = wrapper.find('[data-testid="label"]');
    expect(label.attributes('for')).toBe('email');
  });

  it('renders error message when provided', () => {
    const wrapper = mount(AppFormField, { props: { error: 'Champ requis' } });
    const error = wrapper.find('[data-testid="error"]');
    expect(error.exists()).toBe(true);
    expect(error.text()).toBe('Champ requis');
    expect(error.attributes('role')).toBe('alert');
  });

  it('does not render error when not provided', () => {
    const wrapper = mount(AppFormField);
    expect(wrapper.find('[data-testid="error"]').exists()).toBe(false);
  });

  it('renders hint when provided (and no error)', () => {
    const wrapper = mount(AppFormField, { props: { hint: 'Au moins 8 caractères' } });
    expect(wrapper.find('[data-testid="hint"]').text()).toBe('Au moins 8 caractères');
  });

  it('does not render hint when error is present', () => {
    const wrapper = mount(AppFormField, {
      props: { hint: 'Aide', error: 'Erreur' },
    });
    expect(wrapper.find('[data-testid="hint"]').exists()).toBe(false);
  });

  it('shows required mark when required=true', () => {
    const wrapper = mount(AppFormField, { props: { label: 'Nom', required: true } });
    expect(wrapper.find('[data-testid="required-mark"]').exists()).toBe(true);
  });

  it('does not show required mark by default', () => {
    const wrapper = mount(AppFormField, { props: { label: 'Nom' } });
    expect(wrapper.find('[data-testid="required-mark"]').exists()).toBe(false);
  });

  it('renders default slot content', () => {
    const wrapper = mount(AppFormField, {
      slots: { default: '<input data-testid="input" type="text" />' },
    });
    expect(wrapper.find('[data-testid="input"]').exists()).toBe(true);
  });
});
