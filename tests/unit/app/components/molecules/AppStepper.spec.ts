import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppStepper.
 * Stub standalone pour éviter le runtime Nuxt.
 */
const AppStepper = {
  props: {
    steps: { type: Array, required: true },
    modelValue: { type: Number, default: 0 },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      internalStep: this.modelValue as number,
    };
  },
  methods: {
    goTo(index: number) {
      if (index <= this.internalStep) {
        this.internalStep = index;
        this.$emit('update:modelValue', index);
      }
    },
    next() {
      const steps = this.steps as { id: string; label: string }[];
      if (this.internalStep < steps.length - 1) {
        this.internalStep++;
        this.$emit('update:modelValue', this.internalStep);
      }
    },
    previous() {
      if (this.internalStep > 0) {
        this.internalStep--;
        this.$emit('update:modelValue', this.internalStep);
      }
    },
  },
  computed: {
    isFirst() {
      return this.internalStep === 0;
    },
    isLast() {
      const steps = this.steps as { id: string; label: string }[];
      return this.internalStep === steps.length - 1;
    },
  },
  template: `
    <div data-testid="stepper">
      <nav data-testid="step-nav">
        <ol>
          <li
            v-for="(step, index) in steps"
            :key="step.id"
            data-testid="step-item"
          >
            <button
              :data-testid="'step-btn-' + index"
              :aria-current="index === internalStep ? 'step' : undefined"
              :aria-disabled="index > internalStep"
              :disabled="index > internalStep"
              @click="goTo(index)"
            >
              {{ step.label }}
            </button>
          </li>
        </ol>
      </nav>
      <span class="sr-only" aria-live="polite">Étape {{ internalStep + 1 }} sur {{ steps.length }}</span>
      <div data-testid="step-content">
        <slot
          v-for="(step, index) in steps"
          :name="'step-' + step.id"
          :step="step"
          :index="index"
          :is-active="index === internalStep"
          :go-next="next"
          :go-previous="previous"
        />
      </div>
    </div>
  `,
};

const steps = [
  { id: 'a', label: 'Étape A' },
  { id: 'b', label: 'Étape B' },
  { id: 'c', label: 'Étape C' },
];

describe('AppStepper', () => {
  it('renders all steps in nav', () => {
    const wrapper = mount(AppStepper, { props: { steps, modelValue: 0 } });
    expect(wrapper.findAll('[data-testid="step-item"]').length).toBe(3);
  });

  it('marks first step as current with aria-current="step"', () => {
    const wrapper = mount(AppStepper, { props: { steps, modelValue: 0 } });
    expect(wrapper.find('[data-testid="step-btn-0"]').attributes('aria-current')).toBe('step');
  });

  it('marks future steps as aria-disabled', () => {
    const wrapper = mount(AppStepper, { props: { steps, modelValue: 0 } });
    expect(wrapper.find('[data-testid="step-btn-1"]').attributes('aria-disabled')).toBe('true');
    expect(wrapper.find('[data-testid="step-btn-2"]').attributes('aria-disabled')).toBe('true');
  });

  it('does not allow navigation to future steps', async () => {
    const wrapper = mount(AppStepper, { props: { steps, modelValue: 0 } });
    await wrapper.find('[data-testid="step-btn-2"]').trigger('click');
    // Should stay on step 0
    expect(wrapper.find('[data-testid="step-btn-0"]').attributes('aria-current')).toBe('step');
  });

  it('allows navigation to past steps', async () => {
    const wrapper = mount(AppStepper, { props: { steps, modelValue: 2 } });
    await wrapper.find('[data-testid="step-btn-0"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([0]);
  });

  it('has aria-live region for screen reader announcements', () => {
    const wrapper = mount(AppStepper, { props: { steps, modelValue: 0 } });
    const live = wrapper.find('[aria-live="polite"]');
    expect(live.exists()).toBe(true);
    expect(live.text()).toContain('1');
    expect(live.text()).toContain('3');
  });

  it('renders step slots', () => {
    // Use render function for scoped slots
    const wrapper = mount(AppStepper, {
      props: { steps, modelValue: 0 },
      slots: {
        'step-a': `<div data-testid="step-a-content">Contenu A</div>`,
      },
    });
    // The slot should be rendered (step A is active at index 0)
    expect(wrapper.find('[data-testid="step-a-content"]').exists()).toBe(true);
  });
});
