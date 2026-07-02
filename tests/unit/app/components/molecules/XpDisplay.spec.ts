// @vitest-environment happy-dom
//
// Tests unitaires pour XpDisplay.vue (ST-11.1).

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}(${JSON.stringify(params)})`;
    }
    return key;
  },
}));

const UIconStub = {
  props: ['name', 'class'],
  template: `<span data-testid="u-icon" :data-name="name" />`,
};

const { default: XpDisplay } = await import('~/components/molecules/XpDisplay.vue');

function mountComponent(props: {
  xpTotal: number;
  xpObjectiveMonthly?: number | null;
  xpThisMonth?: number;
}) {
  return mount(XpDisplay, {
    props,
    global: { stubs: { UIcon: UIconStub } },
  });
}

describe('XpDisplay — total XP', () => {
  it('affiche le total XP', () => {
    const wrapper = mountComponent({ xpTotal: 250 });
    expect(wrapper.text()).toContain('xp.total');
  });

  it('affiche une icône star', () => {
    const wrapper = mountComponent({ xpTotal: 100 });
    const icon = wrapper.find('[data-testid="u-icon"]');
    expect(icon.attributes('data-name')).toBe('i-tabler-star');
  });
});

describe('XpDisplay — sans objectif mensuel', () => {
  it("n'affiche pas la jauge si xpObjectiveMonthly est null", () => {
    const wrapper = mountComponent({ xpTotal: 100, xpObjectiveMonthly: null });
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
  });

  it("n'affiche pas la jauge si xpObjectiveMonthly est undefined", () => {
    const wrapper = mountComponent({ xpTotal: 100 });
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
  });

  it("n'affiche pas la jauge si xpObjectiveMonthly est 0", () => {
    const wrapper = mountComponent({ xpTotal: 100, xpObjectiveMonthly: 0 });
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
  });
});

describe('XpDisplay — jauge mensuelle (ARIA)', () => {
  it('affiche un progressbar quand xpObjectiveMonthly est défini', () => {
    const wrapper = mountComponent({
      xpTotal: 500,
      xpObjectiveMonthly: 500,
      xpThisMonth: 250,
    });
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(true);
  });

  it('progressbar a aria-valuemin=0 et aria-valuemax=100', () => {
    const wrapper = mountComponent({
      xpTotal: 100,
      xpObjectiveMonthly: 500,
      xpThisMonth: 100,
    });
    const bar = wrapper.find('[role="progressbar"]');
    expect(bar.attributes('aria-valuemin')).toBe('0');
    expect(bar.attributes('aria-valuemax')).toBe('100');
  });

  it('aria-valuenow correspond au pourcentage calculé', () => {
    const wrapper = mountComponent({
      xpTotal: 500,
      xpObjectiveMonthly: 1000,
      xpThisMonth: 500,
    });
    const bar = wrapper.find('[role="progressbar"]');
    // 500/1000 = 50%
    expect(bar.attributes('aria-valuenow')).toBe('50');
  });

  it('plafonne aria-valuenow à 100 si xpThisMonth > objectif', () => {
    const wrapper = mountComponent({
      xpTotal: 1200,
      xpObjectiveMonthly: 1000,
      xpThisMonth: 1200,
    });
    const bar = wrapper.find('[role="progressbar"]');
    expect(bar.attributes('aria-valuenow')).toBe('100');
  });

  it('progressbar a un aria-label descriptif', () => {
    const wrapper = mountComponent({
      xpTotal: 500,
      xpObjectiveMonthly: 1000,
      xpThisMonth: 500,
    });
    const bar = wrapper.find('[role="progressbar"]');
    expect(bar.attributes('aria-label')).toContain('xp.monthlyProgressAriaLabel');
  });

  it('xpThisMonth=0 par défaut si non fourni', () => {
    const wrapper = mountComponent({
      xpTotal: 100,
      xpObjectiveMonthly: 500,
      // xpThisMonth omis
    });
    const bar = wrapper.find('[role="progressbar"]');
    expect(bar.attributes('aria-valuenow')).toBe('0');
  });
});

describe('XpDisplay — objectif atteint', () => {
  it('affiche le message de succès quand objectif atteint', () => {
    const wrapper = mountComponent({
      xpTotal: 500,
      xpObjectiveMonthly: 500,
      xpThisMonth: 500,
    });
    expect(wrapper.text()).toContain('xp.objectiveMet');
  });

  it("n'affiche pas le message de succès si objectif non atteint", () => {
    const wrapper = mountComponent({
      xpTotal: 300,
      xpObjectiveMonthly: 500,
      xpThisMonth: 300,
    });
    expect(wrapper.text()).not.toContain('xp.objectiveMet');
  });

  it('la barre de progression devient success quand objectif atteint', () => {
    const wrapper = mountComponent({
      xpTotal: 500,
      xpObjectiveMonthly: 500,
      xpThisMonth: 500,
    });
    const fill = wrapper.find('.h-full.rounded-full');
    expect(fill.classes()).toContain('bg-success-solid');
  });

  it('la barre de progression est accent quand objectif non atteint', () => {
    const wrapper = mountComponent({
      xpTotal: 250,
      xpObjectiveMonthly: 500,
      xpThisMonth: 250,
    });
    const fill = wrapper.find('.h-full.rounded-full');
    expect(fill.classes()).toContain('bg-accent');
  });
});
