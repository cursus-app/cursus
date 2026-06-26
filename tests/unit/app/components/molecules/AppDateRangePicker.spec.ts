import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppDateRangePicker.
 * Stub standalone pour éviter le runtime Nuxt.
 */

interface DateRange {
  start: string | null;
  end: string | null;
}

const AppDateRangePicker = {
  props: {
    modelValue: { type: Object as () => DateRange, default: () => ({ start: null, end: null }) },
    min: { default: null },
    max: { default: null },
    label: { default: null },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  computed: {
    endError(): string | null {
      const { start, end } = this.modelValue as DateRange;
      if (start && end && end < start) {
        return 'La date de fin doit être après la date de début';
      }
      return null;
    },
    endMin(): string | undefined {
      return (this.modelValue as DateRange).start ?? this.min ?? undefined;
    },
  },
  methods: {
    onStartChange(value: string) {
      const range: DateRange = { start: value || null, end: (this.modelValue as DateRange).end };
      if (range.start && range.end && range.end < range.start) {
        range.end = null;
      }
      this.$emit('update:modelValue', range);
    },
    onEndChange(value: string) {
      this.$emit('update:modelValue', {
        start: (this.modelValue as DateRange).start,
        end: value || null,
      });
    },
  },
  template: `
    <div
      data-testid="date-range"
      role="group"
      :aria-label="label || 'Plage de dates'"
    >
      <div>
        <label for="start-date" data-testid="start-label">Date de début</label>
        <input
          id="start-date"
          data-testid="start-input"
          type="date"
          :value="modelValue.start || ''"
          :min="min || undefined"
          :max="max || undefined"
          :disabled="disabled"
          @change="onStartChange($event.target.value)"
        />
      </div>
      <div>
        <label for="end-date" data-testid="end-label">Date de fin</label>
        <input
          id="end-date"
          data-testid="end-input"
          type="date"
          :value="modelValue.end || ''"
          :min="endMin"
          :max="max || undefined"
          :disabled="disabled"
          :aria-invalid="!!endError"
          :aria-describedby="endError ? 'date-error' : undefined"
          @change="onEndChange($event.target.value)"
        />
      </div>
      <p
        v-if="endError"
        id="date-error"
        data-testid="error-msg"
        role="alert"
      >
        {{ endError }}
      </p>
    </div>
  `,
};

describe('AppDateRangePicker', () => {
  it('renders the group with role="group"', () => {
    const wrapper = mount(AppDateRangePicker);
    expect(wrapper.find('[data-testid="date-range"]').attributes('role')).toBe('group');
  });

  it('has aria-label on group', () => {
    const wrapper = mount(AppDateRangePicker, { props: { label: 'Période de la cohorte' } });
    expect(wrapper.find('[data-testid="date-range"]').attributes('aria-label')).toBe(
      'Période de la cohorte',
    );
  });

  it('renders start and end date inputs', () => {
    const wrapper = mount(AppDateRangePicker);
    expect(wrapper.find('[data-testid="start-input"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="end-input"]').exists()).toBe(true);
  });

  it('labels are associated to inputs via for/id', () => {
    const wrapper = mount(AppDateRangePicker);
    expect(wrapper.find('[data-testid="start-label"]').attributes('for')).toBe('start-date');
    expect(wrapper.find('[data-testid="end-label"]').attributes('for')).toBe('end-date');
  });

  it('sets start input value from modelValue', () => {
    const wrapper = mount(AppDateRangePicker, {
      props: { modelValue: { start: '2026-09-01', end: null } },
    });
    const input = wrapper.find('[data-testid="start-input"]').element as HTMLInputElement;
    expect(input.value).toBe('2026-09-01');
  });

  it('sets end input value from modelValue', () => {
    const wrapper = mount(AppDateRangePicker, {
      props: { modelValue: { start: null, end: '2026-12-31' } },
    });
    const input = wrapper.find('[data-testid="end-input"]').element as HTMLInputElement;
    expect(input.value).toBe('2026-12-31');
  });

  it('does not show error when dates are valid', () => {
    const wrapper = mount(AppDateRangePicker, {
      props: { modelValue: { start: '2026-09-01', end: '2026-12-31' } },
    });
    expect(wrapper.find('[data-testid="error-msg"]').exists()).toBe(false);
  });

  it('shows error when end date is before start date', () => {
    const wrapper = mount(AppDateRangePicker, {
      props: { modelValue: { start: '2026-12-01', end: '2026-09-01' } },
    });
    expect(wrapper.find('[data-testid="error-msg"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="error-msg"]').text()).toContain('après');
  });

  it('error message has role="alert"', () => {
    const wrapper = mount(AppDateRangePicker, {
      props: { modelValue: { start: '2026-12-01', end: '2026-09-01' } },
    });
    expect(wrapper.find('[data-testid="error-msg"]').attributes('role')).toBe('alert');
  });

  it('end input has aria-invalid when error', () => {
    const wrapper = mount(AppDateRangePicker, {
      props: { modelValue: { start: '2026-12-01', end: '2026-09-01' } },
    });
    expect(wrapper.find('[data-testid="end-input"]').attributes('aria-invalid')).toBe('true');
  });

  it('end input has aria-describedby pointing to error when error', () => {
    const wrapper = mount(AppDateRangePicker, {
      props: { modelValue: { start: '2026-12-01', end: '2026-09-01' } },
    });
    expect(wrapper.find('[data-testid="end-input"]').attributes('aria-describedby')).toBe(
      'date-error',
    );
  });

  it('disables both inputs when disabled=true', () => {
    const wrapper = mount(AppDateRangePicker, { props: { disabled: true } });
    const start = wrapper.find('[data-testid="start-input"]').element as HTMLInputElement;
    const end = wrapper.find('[data-testid="end-input"]').element as HTMLInputElement;
    expect(start.disabled).toBe(true);
    expect(end.disabled).toBe(true);
  });

  it('emits update:modelValue on start date change', async () => {
    const wrapper = mount(AppDateRangePicker, {
      props: { modelValue: { start: null, end: null } },
    });
    const input = wrapper.find('[data-testid="start-input"]');
    // Use setValue for input elements (sets value then dispatches change event)
    await input.setValue('2026-09-01');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('applies min attribute from prop', () => {
    const wrapper = mount(AppDateRangePicker, { props: { min: '2026-01-01' } });
    const startInput = wrapper.find('[data-testid="start-input"]').element as HTMLInputElement;
    expect(startInput.min).toBe('2026-01-01');
  });

  it('end input has min set to start date value', () => {
    const wrapper = mount(AppDateRangePicker, {
      props: { modelValue: { start: '2026-06-01', end: null } },
    });
    const endInput = wrapper.find('[data-testid="end-input"]').element as HTMLInputElement;
    expect(endInput.min).toBe('2026-06-01');
  });
});
