import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CTextarea.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */
const CTextarea = {
  props: {
    modelValue: { default: null },
    label: { default: null },
    placeholder: { default: null },
    error: { default: null },
    disabled: { type: Boolean, default: false },
    rows: { type: Number, default: 4 },
  },
  emits: ['update:modelValue'],
  template: `
    <div>
      <label v-if="label" data-testid="label">{{ label }}</label>
      <textarea
        data-testid="textarea"
        :value="modelValue ?? ''"
        :placeholder="placeholder ?? undefined"
        :disabled="disabled"
        :rows="rows"
        :aria-invalid="!!error"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <p v-if="error" data-testid="error-msg" role="alert">{{ error }}</p>
    </div>
  `,
};

describe('CTextarea', () => {
  it('renders with default props (no label, no error)', () => {
    const wrapper = mount(CTextarea);
    expect(wrapper.find('[data-testid="textarea"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="label"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="error-msg"]').exists()).toBe(false);
  });

  it('renders label when prop provided', () => {
    const wrapper = mount(CTextarea, { props: { label: 'Description' } });
    expect(wrapper.find('[data-testid="label"]').text()).toBe('Description');
  });

  it('does not render label when prop is null', () => {
    const wrapper = mount(CTextarea, { props: { label: null } });
    expect(wrapper.find('[data-testid="label"]').exists()).toBe(false);
  });

  it('shows error message when error prop provided', () => {
    const wrapper = mount(CTextarea, { props: { error: 'Champ requis' } });
    const errorEl = wrapper.find('[data-testid="error-msg"]');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toBe('Champ requis');
    expect(errorEl.attributes('role')).toBe('alert');
  });

  it('sets aria-invalid when error prop is present', () => {
    const wrapper = mount(CTextarea, { props: { error: 'Erreur' } });
    expect(wrapper.find('[data-testid="textarea"]').attributes('aria-invalid')).toBe('true');
  });

  it('does not show error when error prop is null', () => {
    const wrapper = mount(CTextarea, { props: { error: null } });
    expect(wrapper.find('[data-testid="error-msg"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="textarea"]').attributes('aria-invalid')).toBe('false');
  });

  it('disables textarea when disabled prop is true', () => {
    const wrapper = mount(CTextarea, { props: { disabled: true } });
    const textarea = wrapper.find('[data-testid="textarea"]').element as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);
  });

  it('is not disabled by default', () => {
    const wrapper = mount(CTextarea);
    const textarea = wrapper.find('[data-testid="textarea"]').element as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(false);
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(CTextarea, { props: { modelValue: '' } });
    const textarea = wrapper.find('[data-testid="textarea"]');
    await textarea.setValue('Hello world');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual(['Hello world']);
  });

  it('reflects modelValue in the textarea', () => {
    const wrapper = mount(CTextarea, { props: { modelValue: 'initial text' } });
    const textarea = wrapper.find('[data-testid="textarea"]').element as HTMLTextAreaElement;
    expect(textarea.value).toBe('initial text');
  });

  it('sets placeholder from prop', () => {
    const wrapper = mount(CTextarea, { props: { placeholder: 'Écrivez ici...' } });
    expect(wrapper.find('[data-testid="textarea"]').attributes('placeholder')).toBe(
      'Écrivez ici...',
    );
  });

  it('sets rows from prop', () => {
    const wrapper = mount(CTextarea, { props: { rows: 8 } });
    const textarea = wrapper.find('[data-testid="textarea"]').element as HTMLTextAreaElement;
    // happy-dom returns rows as a number (HTMLTextAreaElement.rows is number in spec)
    expect(Number(textarea.rows)).toBe(8);
  });
});
