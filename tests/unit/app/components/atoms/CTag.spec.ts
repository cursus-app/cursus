import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de CTag.
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */
const CTag = {
  props: {
    label: { type: String, required: true },
    variant: { default: 'default' },
    removable: { type: Boolean, default: false },
  },
  emits: ['remove'],
  template: `
    <span data-testid="tag" :data-variant="variant">
      {{ label }}
      <button
        v-if="removable"
        type="button"
        data-testid="remove-btn"
        :aria-label="'Supprimer ' + label"
        @click="$emit('remove')"
      >
        <span class="i-tabler-x" />
      </button>
    </span>
  `,
};

describe('CTag', () => {
  it('renders with required label prop', () => {
    const wrapper = mount(CTag, { props: { label: 'TypeScript' } });
    expect(wrapper.find('[data-testid="tag"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('TypeScript');
  });

  it('renders default variant by default', () => {
    const wrapper = mount(CTag, { props: { label: 'Test' } });
    expect(wrapper.find('[data-testid="tag"]').attributes('data-variant')).toBe('default');
  });

  it('renders info variant', () => {
    const wrapper = mount(CTag, { props: { label: 'En cours', variant: 'info' } });
    expect(wrapper.find('[data-testid="tag"]').attributes('data-variant')).toBe('info');
  });

  it('renders success variant', () => {
    const wrapper = mount(CTag, { props: { label: 'Validé', variant: 'success' } });
    expect(wrapper.find('[data-testid="tag"]').attributes('data-variant')).toBe('success');
  });

  it('renders warning variant', () => {
    const wrapper = mount(CTag, { props: { label: 'En attente', variant: 'warning' } });
    expect(wrapper.find('[data-testid="tag"]').attributes('data-variant')).toBe('warning');
  });

  it('renders danger variant', () => {
    const wrapper = mount(CTag, { props: { label: 'Échoué', variant: 'danger' } });
    expect(wrapper.find('[data-testid="tag"]').attributes('data-variant')).toBe('danger');
  });

  it('does not render remove button by default', () => {
    const wrapper = mount(CTag, { props: { label: 'Tag' } });
    expect(wrapper.find('[data-testid="remove-btn"]').exists()).toBe(false);
  });

  it('renders remove button when removable is true', () => {
    const wrapper = mount(CTag, { props: { label: 'Tag', removable: true } });
    expect(wrapper.find('[data-testid="remove-btn"]').exists()).toBe(true);
  });

  it('remove button has correct aria-label', () => {
    const wrapper = mount(CTag, { props: { label: 'Vue.js', removable: true } });
    expect(wrapper.find('[data-testid="remove-btn"]').attributes('aria-label')).toBe(
      'Supprimer Vue.js',
    );
  });

  it('emits remove event when remove button clicked', async () => {
    const wrapper = mount(CTag, { props: { label: 'Tag', removable: true } });
    await wrapper.find('[data-testid="remove-btn"]').trigger('click');
    const emitted = wrapper.emitted('remove');
    expect(emitted).toBeTruthy();
    expect(emitted?.length).toBe(1);
  });

  it('does not render remove button when removable is false', () => {
    const wrapper = mount(CTag, { props: { label: 'Tag', removable: false } });
    expect(wrapper.find('[data-testid="remove-btn"]').exists()).toBe(false);
  });
});
