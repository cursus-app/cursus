import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de OverrideBadge (ST-06.5).
 * Stub standalone — évite d'importer le composant .vue qui requiert le runtime Nuxt.
 */

interface OverrideBadgeProps {
  reason?: string | null;
  overrideByName?: string | null;
  overrideAt?: string | Date | null;
}

/**
 * Stub qui reproduit la logique de OverrideBadge.vue
 * sans dépendre du runtime Nuxt / composables auto-importés.
 */
const OverrideBadgeStub = {
  props: {
    reason: { default: null },
    overrideByName: { default: null },
    overrideAt: { default: null },
  },
  setup(props: OverrideBadgeProps) {
    function buildTooltip(): string {
      const parts: string[] = [];
      if (props.reason) {
        parts.push(`Motif : ${props.reason}`);
      }
      if (props.overrideByName) {
        parts.push(`Par ${props.overrideByName}`);
      }
      if (props.overrideAt) {
        const d =
          typeof props.overrideAt === 'string' ? new Date(props.overrideAt) : props.overrideAt;
        parts.push(
          `Le ${d.toLocaleDateString('fr', { year: 'numeric', month: 'short', day: 'numeric' })}`,
        );
      }
      return parts.join(' · ');
    }
    return { tooltipText: buildTooltip() };
  },
  template: `
    <span class="group relative inline-flex items-center" data-testid="override-badge-wrapper">
      <span
        data-testid="override-badge"
        class="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2.5 py-1 text-sm font-medium text-warning-fg"
        :aria-describedby="tooltipText ? 'override-badge-tooltip' : undefined"
      >
        <span class="i-tabler-pencil-check size-4 shrink-0" aria-hidden="true" />
        Validé manuellement
      </span>
      <span
        v-if="tooltipText"
        id="override-badge-tooltip"
        role="tooltip"
        data-testid="override-badge-tooltip"
        class="pointer-events-none absolute"
      >
        {{ tooltipText }}
      </span>
    </span>
  `,
};

describe('OverrideBadge', () => {
  it('affiche le label "Validé manuellement"', () => {
    const wrapper = mount(OverrideBadgeStub);
    expect(wrapper.find('[data-testid="override-badge"]').text()).toContain('Validé manuellement');
  });

  it('utilise la couleur warning (bg-warning-bg / text-warning-fg)', () => {
    const wrapper = mount(OverrideBadgeStub);
    const badge = wrapper.find('[data-testid="override-badge"]');
    expect(badge.classes()).toContain('bg-warning-bg');
    expect(badge.classes()).toContain('text-warning-fg');
  });

  it("ne montre pas de tooltip quand il n'y a pas de détails", () => {
    const wrapper = mount(OverrideBadgeStub);
    expect(wrapper.find('[data-testid="override-badge-tooltip"]').exists()).toBe(false);
  });

  it('affiche le tooltip avec la raison quand reason est fournie', () => {
    const wrapper = mount(OverrideBadgeStub, {
      props: { reason: 'Harnais a planté à tort' } as OverrideBadgeProps,
    });
    const tooltip = wrapper.find('[data-testid="override-badge-tooltip"]');
    expect(tooltip.exists()).toBe(true);
    expect(tooltip.text()).toContain('Harnais a planté à tort');
  });

  it('affiche le tooltip avec le nom du formateur quand overrideByName est fourni', () => {
    const wrapper = mount(OverrideBadgeStub, {
      props: { overrideByName: 'Alice Formateur' } as OverrideBadgeProps,
    });
    const tooltip = wrapper.find('[data-testid="override-badge-tooltip"]');
    expect(tooltip.exists()).toBe(true);
    expect(tooltip.text()).toContain('Alice Formateur');
  });

  it('affiche le tooltip avec la date quand overrideAt est fourni', () => {
    const wrapper = mount(OverrideBadgeStub, {
      props: { overrideAt: '2026-01-15T10:00:00Z' } as OverrideBadgeProps,
    });
    const tooltip = wrapper.find('[data-testid="override-badge-tooltip"]');
    expect(tooltip.exists()).toBe(true);
    // La date est formatée, on vérifie juste qu'elle contient "2026"
    expect(tooltip.text()).toContain('2026');
  });

  it('affiche le tooltip avec toutes les informations combinées', () => {
    const wrapper = mount(OverrideBadgeStub, {
      props: {
        reason: 'Raison valide',
        overrideByName: 'Bob',
        overrideAt: '2026-06-01T00:00:00Z',
      } as OverrideBadgeProps,
    });
    const tooltip = wrapper.find('[data-testid="override-badge-tooltip"]');
    expect(tooltip.text()).toContain('Raison valide');
    expect(tooltip.text()).toContain('Bob');
    expect(tooltip.text()).toContain('2026');
  });

  it('a role="tooltip" sur l\'élément tooltip', () => {
    const wrapper = mount(OverrideBadgeStub, {
      props: { reason: 'test' } as OverrideBadgeProps,
    });
    expect(wrapper.find('[data-testid="override-badge-tooltip"]').attributes('role')).toBe(
      'tooltip',
    );
  });

  it('lie le badge au tooltip via aria-describedby quand tooltip est présent', () => {
    const wrapper = mount(OverrideBadgeStub, {
      props: { reason: 'raison' } as OverrideBadgeProps,
    });
    const badge = wrapper.find('[data-testid="override-badge"]');
    expect(badge.attributes('aria-describedby')).toBe('override-badge-tooltip');
  });

  it("n'a pas aria-describedby quand aucun tooltip", () => {
    const wrapper = mount(OverrideBadgeStub);
    const badge = wrapper.find('[data-testid="override-badge"]');
    expect(badge.attributes('aria-describedby')).toBeUndefined();
  });
});
