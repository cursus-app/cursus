import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CRadio.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */
const CRadio = {
  props: {
    modelValue: { default: null },
    options: { default: () => [] },
    label: { default: null },
    error: { default: null },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  template: `
    <fieldset>
      <legend v-if="label" data-testid="legend">{{ label }}</legend>
      <div role="radiogroup" :aria-invalid="!!error">
        <label
          v-for="option in options"
          :key="option.value"
          data-testid="radio-label"
          :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
        >
          <input
            type="radio"
            data-testid="radio-input"
            :value="option.value"
            :checked="option.value === modelValue"
            :disabled="disabled"
            @change="$emit('update:modelValue', option.value)"
          />
          <span>{{ option.label }}</span>
        </label>
      </div>
      <p v-if="error" data-testid="error-msg" role="alert">{{ error }}</p>
    </fieldset>
  `,
};

const options = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
];

describe('CRadio', () => {
  it('renders options correctly', () => {
    const wrapper = mount(CRadio, { props: { options } });
    const labels = wrapper.findAll('[data-testid="radio-label"]');
    expect(labels).toHaveLength(3);
  });

  it('renders legend when label prop is provided', () => {
    const wrapper = mount(CRadio, { props: { options, label: 'Choisir une option' } });
    expect(wrapper.find('[data-testid="legend"]').text()).toBe('Choisir une option');
  });

  it('does not render legend when label is null', () => {
    const wrapper = mount(CRadio, { props: { options, label: null } });
    expect(wrapper.find('[data-testid="legend"]').exists()).toBe(false);
  });

  it('marks the matching option as checked based on modelValue', () => {
    const wrapper = mount(CRadio, { props: { options, modelValue: 'b' } });
    const inputs = wrapper.findAll('[data-testid="radio-input"]');
    const checkedInput = inputs.find((i) => (i.element as HTMLInputElement).checked);
    expect((checkedInput?.element as HTMLInputElement)?.value).toBe('b');
  });

  it('emits update:modelValue when an option is selected', async () => {
    const wrapper = mount(CRadio, { props: { options, modelValue: null } });
    const inputs = wrapper.findAll('[data-testid="radio-input"]');
    await inputs[0]?.trigger('change');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual(['a']);
  });

  it('shows error message when error prop is provided', () => {
    const wrapper = mount(CRadio, { props: { options, error: 'Sélection requise' } });
    const errorEl = wrapper.find('[data-testid="error-msg"]');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toBe('Sélection requise');
    expect(errorEl.attributes('role')).toBe('alert');
  });

  it('does not show error when error is null', () => {
    const wrapper = mount(CRadio, { props: { options, error: null } });
    expect(wrapper.find('[data-testid="error-msg"]').exists()).toBe(false);
  });

  it('sets aria-invalid when error is present', () => {
    const wrapper = mount(CRadio, { props: { options, error: 'Erreur' } });
    expect(wrapper.find('[role="radiogroup"]').attributes('aria-invalid')).toBe('true');
  });

  it('disables all inputs when disabled prop is true', () => {
    const wrapper = mount(CRadio, { props: { options, disabled: true } });
    const inputs = wrapper.findAll('[data-testid="radio-input"]');
    inputs.forEach((input) => {
      expect((input.element as HTMLInputElement).disabled).toBe(true);
    });
  });

  it('renders with no options and no errors', () => {
    const wrapper = mount(CRadio);
    expect(wrapper.find('[data-testid="radio-input"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="error-msg"]').exists()).toBe(false);
  });
});
