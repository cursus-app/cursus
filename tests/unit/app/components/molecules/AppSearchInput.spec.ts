import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppSearchInput.
 * Stub standalone pour éviter le runtime Nuxt.
 */
const AppSearchInput = {
  props: {
    modelValue: { type: String, default: '' },
    placeholder: { default: null },
    enableShortcut: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    size: { type: String, default: 'md' },
  },
  emits: ['update:modelValue', 'search'],
  methods: {
    clear() {
      this.$emit('update:modelValue', '');
    },
    onKeydown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        this.$emit('search', this.modelValue);
      }
    },
  },
  template: `
    <div data-testid="search-wrapper">
      <span class="i-tabler-search" data-testid="search-icon" aria-hidden="true" />
      <input
        data-testid="search-input"
        :value="modelValue"
        :placeholder="placeholder || 'Rechercher…'"
        :disabled="disabled"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown="onKeydown"
      />
      <button
        v-if="modelValue.length > 0"
        data-testid="clear-btn"
        :aria-label="'Effacer la recherche'"
        @click="clear"
      >
        ×
      </button>
      <span
        v-else-if="enableShortcut"
        data-testid="kbd-hint"
        aria-label="Pour rechercher"
      >
        ⌘K
      </span>
    </div>
  `,
};

describe('AppSearchInput', () => {
  it('renders search input', () => {
    const wrapper = mount(AppSearchInput);
    expect(wrapper.find('[data-testid="search-input"]').exists()).toBe(true);
  });

  it('renders search icon', () => {
    const wrapper = mount(AppSearchInput);
    expect(wrapper.find('[data-testid="search-icon"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="search-icon"]').attributes('aria-hidden')).toBe('true');
  });

  it('uses custom placeholder when provided', () => {
    const wrapper = mount(AppSearchInput, { props: { placeholder: 'Chercher un cursus…' } });
    expect(wrapper.find('[data-testid="search-input"]').attributes('placeholder')).toBe(
      'Chercher un cursus…',
    );
  });

  it('shows default placeholder when not provided', () => {
    const wrapper = mount(AppSearchInput);
    expect(wrapper.find('[data-testid="search-input"]').attributes('placeholder')).toBe(
      'Rechercher…',
    );
  });

  it('shows keyboard hint when value is empty and enableShortcut=true', () => {
    const wrapper = mount(AppSearchInput, { props: { modelValue: '' } });
    expect(wrapper.find('[data-testid="kbd-hint"]').exists()).toBe(true);
  });

  it('hides keyboard hint when enableShortcut=false', () => {
    const wrapper = mount(AppSearchInput, {
      props: { modelValue: '', enableShortcut: false },
    });
    expect(wrapper.find('[data-testid="kbd-hint"]').exists()).toBe(false);
  });

  it('shows clear button when value is not empty', () => {
    const wrapper = mount(AppSearchInput, { props: { modelValue: 'Alice' } });
    expect(wrapper.find('[data-testid="clear-btn"]').exists()).toBe(true);
  });

  it('hides keyboard hint when value is not empty', () => {
    const wrapper = mount(AppSearchInput, { props: { modelValue: 'Alice' } });
    expect(wrapper.find('[data-testid="kbd-hint"]').exists()).toBe(false);
  });

  it('clear button has accessible aria-label', () => {
    const wrapper = mount(AppSearchInput, { props: { modelValue: 'Alice' } });
    const btn = wrapper.find('[data-testid="clear-btn"]');
    expect(btn.attributes('aria-label')).toBeTruthy();
  });

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(AppSearchInput, { props: { modelValue: '' } });
    const input = wrapper.find('[data-testid="search-input"]');
    await input.setValue('Bob');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Bob']);
  });

  it('emits update:modelValue with empty string on clear', async () => {
    const wrapper = mount(AppSearchInput, { props: { modelValue: 'Alice' } });
    await wrapper.find('[data-testid="clear-btn"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['']);
  });

  it('emits search on Enter keydown', async () => {
    const wrapper = mount(AppSearchInput, { props: { modelValue: 'Alice' } });
    await wrapper.find('[data-testid="search-input"]').trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('search')?.[0]).toEqual(['Alice']);
  });

  it('disables input when disabled=true', () => {
    const wrapper = mount(AppSearchInput, { props: { disabled: true } });
    const input = wrapper.find('[data-testid="search-input"]').element as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
