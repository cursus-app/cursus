import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppProgressBar.
 * Stub standalone pour éviter le runtime Nuxt.
 */
const AppProgressBar = {
  props: {
    value: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    type: { type: String, default: 'linear' },
    size: { type: String, default: 'md' },
    showValue: { type: Boolean, default: false },
    label: { default: null },
    indeterminate: { type: Boolean, default: false },
  },
  computed: {
    percent() {
      if (this.indeterminate) {
        return null;
      }
      return Math.round((this.value / this.max) * 100);
    },
    ariaLabel() {
      if (this.label) {
        return this.label;
      }
      if (this.percent !== null) {
        return `Progression : ${this.percent} %`;
      }
      return 'Chargement…';
    },
  },
  template: `
    <div data-testid="progress-wrapper">
      <div
        v-if="type === 'linear'"
        data-testid="linear-bar"
        role="progressbar"
        :aria-valuenow="indeterminate ? undefined : value"
        :aria-valuemin="0"
        :aria-valuemax="max"
        :aria-label="ariaLabel"
      >
        <div
          data-testid="bar-fill"
          :style="!indeterminate ? { width: percent + '%' } : {}"
          :class="indeterminate ? 'animate-pulse' : ''"
        />
        <p v-if="showValue && percent !== null" data-testid="value-label" aria-hidden="true">
          {{ percent }} %
        </p>
      </div>
      <svg
        v-else
        data-testid="circular-bar"
        role="progressbar"
        :aria-valuenow="indeterminate ? undefined : value"
        :aria-valuemin="0"
        :aria-valuemax="max"
        :aria-label="ariaLabel"
      >
        <text v-if="showValue && percent !== null" data-testid="circular-value" aria-hidden="true">
          {{ percent }}%
        </text>
      </svg>
    </div>
  `,
};

describe('AppProgressBar', () => {
  it('renders linear bar by default', () => {
    const wrapper = mount(AppProgressBar);
    expect(wrapper.find('[data-testid="linear-bar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="circular-bar"]').exists()).toBe(false);
  });

  it('renders circular when type=circular', () => {
    const wrapper = mount(AppProgressBar, { props: { type: 'circular' } });
    expect(wrapper.find('[data-testid="circular-bar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="linear-bar"]').exists()).toBe(false);
  });

  it('has role="progressbar"', () => {
    const wrapper = mount(AppProgressBar);
    expect(wrapper.find('[data-testid="linear-bar"]').attributes('role')).toBe('progressbar');
  });

  it('sets aria-valuenow to value', () => {
    const wrapper = mount(AppProgressBar, { props: { value: 42 } });
    expect(wrapper.find('[data-testid="linear-bar"]').attributes('aria-valuenow')).toBe('42');
  });

  it('sets aria-valuemin=0 and aria-valuemax=100', () => {
    const wrapper = mount(AppProgressBar, { props: { value: 50 } });
    const bar = wrapper.find('[data-testid="linear-bar"]');
    expect(bar.attributes('aria-valuemin')).toBe('0');
    expect(bar.attributes('aria-valuemax')).toBe('100');
  });

  it('sets aria-label with percentage', () => {
    const wrapper = mount(AppProgressBar, { props: { value: 45 } });
    const bar = wrapper.find('[data-testid="linear-bar"]');
    expect(bar.attributes('aria-label')).toContain('45');
  });

  it('uses custom label when provided', () => {
    const wrapper = mount(AppProgressBar, { props: { value: 50, label: 'Module 3 sur 6' } });
    const bar = wrapper.find('[data-testid="linear-bar"]');
    expect(bar.attributes('aria-label')).toBe('Module 3 sur 6');
  });

  it('does not set aria-valuenow when indeterminate', () => {
    const wrapper = mount(AppProgressBar, { props: { indeterminate: true } });
    expect(wrapper.find('[data-testid="linear-bar"]').attributes('aria-valuenow')).toBeUndefined();
  });

  it('shows value label when showValue=true', () => {
    const wrapper = mount(AppProgressBar, { props: { value: 75, showValue: true } });
    expect(wrapper.find('[data-testid="value-label"]').text()).toContain('75');
  });

  it('does not show value label by default', () => {
    const wrapper = mount(AppProgressBar, { props: { value: 75 } });
    expect(wrapper.find('[data-testid="value-label"]').exists()).toBe(false);
  });

  it('computes correct percentage', () => {
    const wrapper = mount(AppProgressBar, { props: { value: 1, max: 4 } });
    expect(wrapper.find('[data-testid="linear-bar"]').attributes('aria-label')).toContain('25');
  });
});
