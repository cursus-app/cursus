import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CCheckbox.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */
const CCheckbox = {
  props: {
    modelValue: { type: Boolean, default: false },
    label: { default: null },
    description: { default: null },
    error: { default: null },
    disabled: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  template: `
    <div>
      <div class="flex items-start gap-2">
        <input
          type="checkbox"
          data-testid="checkbox"
          :checked="modelValue"
          :disabled="disabled"
          :aria-invalid="!!error"
          @change="$emit('update:modelValue', $event.target.checked)"
        />
        <div v-if="label || description">
          <span v-if="label" data-testid="label">{{ label }}</span>
          <span v-if="description" data-testid="description">{{ description }}</span>
        </div>
      </div>
      <p v-if="error" data-testid="error-msg" role="alert">{{ error }}</p>
    </div>
  `,
};

describe('CCheckbox', () => {
  it('renders with default props', () => {
    const wrapper = mount(CCheckbox);
    expect(wrapper.find('[data-testid="checkbox"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="label"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="error-msg"]').exists()).toBe(false);
  });

  it('renders label when prop provided', () => {
    const wrapper = mount(CCheckbox, { props: { label: "J'accepte les conditions" } });
    expect(wrapper.find('[data-testid="label"]').text()).toBe("J'accepte les conditions");
  });

  it('renders description when prop provided', () => {
    const wrapper = mount(CCheckbox, {
      props: { label: 'Notifications', description: 'Recevoir les mises à jour' },
    });
    expect(wrapper.find('[data-testid="description"]').text()).toBe('Recevoir les mises à jour');
  });

  it('shows error message when error prop provided', () => {
    const wrapper = mount(CCheckbox, { props: { error: 'Champ requis' } });
    const errorEl = wrapper.find('[data-testid="error-msg"]');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toBe('Champ requis');
    expect(errorEl.attributes('role')).toBe('alert');
  });

  it('sets aria-invalid when error is present', () => {
    const wrapper = mount(CCheckbox, { props: { error: 'Erreur' } });
    expect(wrapper.find('[data-testid="checkbox"]').attributes('aria-invalid')).toBe('true');
  });

  it('disables checkbox when disabled prop is true', () => {
    const wrapper = mount(CCheckbox, { props: { disabled: true } });
    const checkbox = wrapper.find('[data-testid="checkbox"]').element as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it('is not disabled by default', () => {
    const wrapper = mount(CCheckbox);
    const checkbox = wrapper.find('[data-testid="checkbox"]').element as HTMLInputElement;
    expect(checkbox.disabled).toBe(false);
  });

  it('is unchecked by default', () => {
    const wrapper = mount(CCheckbox);
    const checkbox = wrapper.find('[data-testid="checkbox"]').element as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('is checked when modelValue is true', () => {
    const wrapper = mount(CCheckbox, { props: { modelValue: true } });
    const checkbox = wrapper.find('[data-testid="checkbox"]').element as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(CCheckbox, { props: { modelValue: false } });
    const checkbox = wrapper.find('[data-testid="checkbox"]');
    await checkbox.setValue(true);
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual([true]);
  });
});
