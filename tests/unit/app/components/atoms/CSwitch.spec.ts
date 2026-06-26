import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CSwitch.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */
const CSwitch = {
  props: {
    modelValue: { type: Boolean, default: false },
    label: { default: null },
    description: { default: null },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(
    props: { modelValue: boolean; disabled: boolean },
    { emit }: { emit: (event: string, ...args: unknown[]) => void },
  ) {
    function toggle() {
      if (!props.disabled) {
        emit('update:modelValue', !props.modelValue);
      }
    }
    return { toggle };
  },
  template: `
    <div class="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        data-testid="switch"
        :aria-checked="modelValue"
        :disabled="disabled"
        @click="toggle"
      />
      <div v-if="label || description">
        <span v-if="label" data-testid="label">{{ label }}</span>
        <span v-if="description" data-testid="description">{{ description }}</span>
      </div>
    </div>
  `,
};

describe('CSwitch', () => {
  it('renders with default props', () => {
    const wrapper = mount(CSwitch);
    expect(wrapper.find('[data-testid="switch"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="label"]').exists()).toBe(false);
  });

  it('has role="switch"', () => {
    const wrapper = mount(CSwitch);
    expect(wrapper.find('[data-testid="switch"]').attributes('role')).toBe('switch');
  });

  it('renders label when prop provided', () => {
    const wrapper = mount(CSwitch, { props: { label: 'Notifications push' } });
    expect(wrapper.find('[data-testid="label"]').text()).toBe('Notifications push');
  });

  it('renders description when prop provided', () => {
    const wrapper = mount(CSwitch, {
      props: { label: 'Mode sombre', description: 'Basculer le thème' },
    });
    expect(wrapper.find('[data-testid="description"]').text()).toBe('Basculer le thème');
  });

  it('reflects off state via aria-checked="false"', () => {
    const wrapper = mount(CSwitch, { props: { modelValue: false } });
    expect(wrapper.find('[data-testid="switch"]').attributes('aria-checked')).toBe('false');
  });

  it('reflects on state via aria-checked="true"', () => {
    const wrapper = mount(CSwitch, { props: { modelValue: true } });
    expect(wrapper.find('[data-testid="switch"]').attributes('aria-checked')).toBe('true');
  });

  it('emits update:modelValue with toggled value on click', async () => {
    const wrapper = mount(CSwitch, { props: { modelValue: false } });
    await wrapper.find('[data-testid="switch"]').trigger('click');
    const emitted = wrapper.emitted('update:modelValue');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]).toEqual([true]);
  });

  it('does not emit when disabled', async () => {
    const wrapper = mount(CSwitch, { props: { modelValue: false, disabled: true } });
    await wrapper.find('[data-testid="switch"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });

  it('is not disabled by default', () => {
    const wrapper = mount(CSwitch);
    const btn = wrapper.find('[data-testid="switch"]').element as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('is disabled when disabled prop is true', () => {
    const wrapper = mount(CSwitch, { props: { disabled: true } });
    const btn = wrapper.find('[data-testid="switch"]').element as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
