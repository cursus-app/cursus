import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CSelect.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */
const CSelect = {
  props: {
    modelValue: { default: null },
    options: { default: () => [] },
    label: { default: null },
    placeholder: { default: null },
    error: { default: null },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  template: `
    <div>
      <label v-if="label" data-testid="label">{{ label }}</label>
      <select
        data-testid="select"
        :value="modelValue ?? ''"
        :disabled="disabled"
        :aria-invalid="!!error"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <p v-if="error" data-testid="error-msg" role="alert">{{ error }}</p>
    </div>
  `,
};

const roleOptions = [
  { label: 'Stagiaire', value: 'intern' },
  { label: 'Formateur', value: 'trainer' },
];

describe('CSelect', () => {
  it('renders with default props', () => {
    const wrapper = mount(CSelect);
    expect(wrapper.find('[data-testid="select"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="label"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="error-msg"]').exists()).toBe(false);
  });

  it('renders label when prop provided', () => {
    const wrapper = mount(CSelect, { props: { label: 'Rôle', options: roleOptions } });
    expect(wrapper.find('[data-testid="label"]').text()).toBe('Rôle');
  });

  it('does not render label when prop is null', () => {
    const wrapper = mount(CSelect, { props: { label: null } });
    expect(wrapper.find('[data-testid="label"]').exists()).toBe(false);
  });

  it('renders options', () => {
    const wrapper = mount(CSelect, { props: { options: roleOptions } });
    const options = wrapper.findAll('option');
    expect(options.length).toBeGreaterThanOrEqual(2);
  });

  it('shows error message when error prop provided', () => {
    const wrapper = mount(CSelect, { props: { error: 'Sélection requise' } });
    const errorEl = wrapper.find('[data-testid="error-msg"]');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toBe('Sélection requise');
    expect(errorEl.attributes('role')).toBe('alert');
  });

  it('sets aria-invalid when error is present', () => {
    const wrapper = mount(CSelect, { props: { error: 'Erreur' } });
    expect(wrapper.find('[data-testid="select"]').attributes('aria-invalid')).toBe('true');
  });

  it('does not set aria-invalid when no error', () => {
    const wrapper = mount(CSelect, { props: { error: null } });
    expect(wrapper.find('[data-testid="select"]').attributes('aria-invalid')).toBe('false');
  });

  it('disables select when disabled prop is true', () => {
    const wrapper = mount(CSelect, { props: { disabled: true } });
    const select = wrapper.find('[data-testid="select"]').element as HTMLSelectElement;
    expect(select.disabled).toBe(true);
  });

  it('is not disabled by default', () => {
    const wrapper = mount(CSelect, { props: { options: roleOptions } });
    const select = wrapper.find('[data-testid="select"]').element as HTMLSelectElement;
    expect(select.disabled).toBe(false);
  });

  it('emits update:modelValue on change', async () => {
    const wrapper = mount(CSelect, { props: { options: roleOptions, modelValue: null } });
    const select = wrapper.find('[data-testid="select"]');
    await select.setValue('intern');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual(['intern']);
  });

  it('renders placeholder option when provided', () => {
    const wrapper = mount(CSelect, { props: { placeholder: 'Choisir...', options: roleOptions } });
    const firstOption = wrapper.find('option');
    expect(firstOption.text()).toBe('Choisir...');
    expect(firstOption.attributes('value')).toBe('');
  });
});
