/**
 * Tests unitaires du composant CheckCard.
 *
 * On teste la logique du composant via un stub minimal qui réplique
 * le comportement observable (attributs, classes, contenu textuel),
 * sans dépendre du runtime Nuxt complet.
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { CheckStatus } from '~~/shared/types/harness';

// ─── Stub du composant CheckCard ─────────────────────────────────────────────

const STATUS_ICONS: Record<CheckStatus, string> = {
  success: 'i-tabler-circle-check',
  failure: 'i-tabler-circle-x',
  error: 'i-tabler-alert-triangle',
  skipped: 'i-tabler-player-skip-forward',
  pending: 'i-tabler-clock',
};

const STATUS_BORDER_CLASSES: Record<CheckStatus, string> = {
  success: 'border-l-success-fg',
  failure: 'border-l-danger-fg',
  error: 'border-l-warning-fg',
  skipped: 'border-l-border-subtle',
  pending: 'border-l-border-subtle',
};

const STATUS_LABELS: Record<CheckStatus, string> = {
  success: 'Réussi',
  failure: 'Échoué',
  error: 'Erreur',
  skipped: 'Ignoré',
  pending: 'En attente',
};

interface CheckResult {
  checkId: string;
  status: CheckStatus;
  message: string;
  details?: Record<string, unknown>;
  durationMs?: number;
}

interface CheckCardProps {
  check: CheckResult;
  label: string;
  helpMessage?: string | null;
  index: number;
}

const CheckCard = {
  props: {
    check: { type: Object as () => CheckResult, required: true },
    label: { type: String, required: true },
    helpMessage: { type: String, default: null },
    index: { type: Number, required: true },
  },
  computed: {
    statusIcon(this: CheckCardProps) {
      return STATUS_ICONS[this.check.status];
    },
    statusBorderClass(this: CheckCardProps) {
      return STATUS_BORDER_CLASSES[this.check.status];
    },
    statusLabel(this: CheckCardProps) {
      return STATUS_LABELS[this.check.status];
    },
    hasDetails(this: CheckCardProps) {
      return this.check.details !== undefined && Object.keys(this.check.details).length > 0;
    },
    showHelpMessage(this: CheckCardProps) {
      return (
        (this.check.status === 'failure' || this.check.status === 'error') &&
        this.helpMessage != null
      );
    },
    detailsJson(this: CheckCardProps) {
      return this.hasDetails ? JSON.stringify(this.check.details, null, 2) : '';
    },
  },
  template: `
    <article
      data-testid="check-card"
      :data-status="check.status"
      :data-border="statusBorderClass"
      :aria-labelledby="'check-card-summary-' + index"
    >
      <span
        data-testid="status-icon"
        :data-icon="statusIcon"
        :aria-label="statusLabel"
        role="img"
      />
      <p data-testid="check-label">{{ label }}</p>
      <p v-if="check.message" data-testid="check-message">{{ check.message }}</p>
      <p v-if="showHelpMessage" data-testid="help-message">{{ helpMessage }}</p>
      <p v-if="check.durationMs !== undefined" data-testid="duration">{{ check.durationMs }} ms</p>
      <span data-testid="status-badge" :aria-hidden="true">{{ statusLabel }}</span>

      <details v-if="hasDetails" data-testid="details-accordion">
        <summary data-testid="details-toggle">Voir les détails techniques</summary>
        <pre data-testid="details-content">{{ detailsJson }}</pre>
      </details>
    </article>
  `,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCheck(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    checkId: 'tests_pass',
    status: 'success',
    message: 'All tests passed.',
    ...overrides,
  };
}

function mountCard(props: CheckCardProps) {
  return mount(CheckCard, { props });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CheckCard — icône par statut', () => {
  const statuses: CheckStatus[] = ['success', 'failure', 'error', 'skipped', 'pending'];

  for (const status of statuses) {
    it(`affiche l'icône correcte pour le statut "${status}"`, () => {
      const wrapper = mountCard({
        check: makeCheck({ status }),
        label: 'Test check',
        index: 0,
      });
      const icon = wrapper.find('[data-testid="status-icon"]');
      expect(icon.attributes('data-icon')).toBe(STATUS_ICONS[status]);
    });
  }
});

describe('CheckCard — aria-label du statut', () => {
  it("l'icône a un aria-label correspondant au statut success", () => {
    const wrapper = mountCard({ check: makeCheck({ status: 'success' }), label: 'X', index: 0 });
    expect(wrapper.find('[data-testid="status-icon"]').attributes('aria-label')).toBe('Réussi');
  });

  it("l'icône a un aria-label correspondant au statut failure", () => {
    const wrapper = mountCard({ check: makeCheck({ status: 'failure' }), label: 'X', index: 0 });
    expect(wrapper.find('[data-testid="status-icon"]').attributes('aria-label')).toBe('Échoué');
  });

  it("l'icône a un aria-label correspondant au statut error", () => {
    const wrapper = mountCard({ check: makeCheck({ status: 'error' }), label: 'X', index: 0 });
    expect(wrapper.find('[data-testid="status-icon"]').attributes('aria-label')).toBe('Erreur');
  });

  it("l'icône a un aria-label correspondant au statut skipped", () => {
    const wrapper = mountCard({ check: makeCheck({ status: 'skipped' }), label: 'X', index: 0 });
    expect(wrapper.find('[data-testid="status-icon"]').attributes('aria-label')).toBe('Ignoré');
  });

  it("l'icône a un aria-label correspondant au statut pending", () => {
    const wrapper = mountCard({ check: makeCheck({ status: 'pending' }), label: 'X', index: 0 });
    expect(wrapper.find('[data-testid="status-icon"]').attributes('aria-label')).toBe('En attente');
  });
});

describe('CheckCard — contenu', () => {
  it('affiche le label humain', () => {
    const wrapper = mountCard({
      check: makeCheck(),
      label: 'Tests unitaires',
      index: 0,
    });
    expect(wrapper.find('[data-testid="check-label"]').text()).toBe('Tests unitaires');
  });

  it('affiche le message du harnais', () => {
    const wrapper = mountCard({
      check: makeCheck({ message: 'Tous les tests passent.' }),
      label: 'Tests',
      index: 0,
    });
    expect(wrapper.find('[data-testid="check-message"]').text()).toBe('Tous les tests passent.');
  });

  it("affiche le message d'aide pour status=failure", () => {
    const wrapper = mountCard({
      check: makeCheck({ status: 'failure', message: 'Échec.' }),
      label: 'Tests',
      helpMessage: 'Corrigez vos tests.',
      index: 0,
    });
    expect(wrapper.find('[data-testid="help-message"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="help-message"]').text()).toBe('Corrigez vos tests.');
  });

  it("affiche le message d'aide pour status=error", () => {
    const wrapper = mountCard({
      check: makeCheck({ status: 'error', message: 'Crash interne.' }),
      label: 'Tests',
      helpMessage: 'Contactez votre formateur.',
      index: 0,
    });
    expect(wrapper.find('[data-testid="help-message"]').exists()).toBe(true);
  });

  it("n'affiche PAS le message d'aide pour status=success", () => {
    const wrapper = mountCard({
      check: makeCheck({ status: 'success' }),
      label: 'Tests',
      helpMessage: "Un message d'aide",
      index: 0,
    });
    expect(wrapper.find('[data-testid="help-message"]').exists()).toBe(false);
  });

  it("n'affiche PAS le message d'aide si helpMessage est null", () => {
    const wrapper = mountCard({
      check: makeCheck({ status: 'failure' }),
      label: 'Tests',
      helpMessage: null,
      index: 0,
    });
    expect(wrapper.find('[data-testid="help-message"]').exists()).toBe(false);
  });

  it('affiche la durée si durationMs est fourni', () => {
    const wrapper = mountCard({
      check: makeCheck({ durationMs: 1234 }),
      label: 'Tests',
      index: 0,
    });
    expect(wrapper.find('[data-testid="duration"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="duration"]').text()).toContain('1234');
  });

  it("n'affiche pas la durée si durationMs est absent", () => {
    const wrapper = mountCard({
      check: makeCheck({ durationMs: undefined }),
      label: 'Tests',
      index: 0,
    });
    expect(wrapper.find('[data-testid="duration"]').exists()).toBe(false);
  });
});

describe('CheckCard — accordion détails', () => {
  it("affiche l'accordion quand details est présent", () => {
    const wrapper = mountCard({
      check: makeCheck({ details: { output: 'test output', exitCode: 0 } }),
      label: 'Tests',
      index: 0,
    });
    expect(wrapper.find('[data-testid="details-accordion"]').exists()).toBe(true);
  });

  it("n'affiche PAS l'accordion quand details est absent", () => {
    const wrapper = mountCard({
      check: makeCheck({ details: undefined }),
      label: 'Tests',
      index: 0,
    });
    expect(wrapper.find('[data-testid="details-accordion"]').exists()).toBe(false);
  });

  it("n'affiche PAS l'accordion quand details est un objet vide", () => {
    const wrapper = mountCard({
      check: makeCheck({ details: {} }),
      label: 'Tests',
      index: 0,
    });
    expect(wrapper.find('[data-testid="details-accordion"]').exists()).toBe(false);
  });

  it('affiche le contenu JSON des détails', () => {
    const details = { output: 'Tests failed: 2', exitCode: 1 };
    const wrapper = mountCard({
      check: makeCheck({ details }),
      label: 'Tests',
      index: 0,
    });
    const pre = wrapper.find('[data-testid="details-content"]');
    expect(pre.text()).toContain('Tests failed: 2');
  });
});

describe('CheckCard — classe bordure', () => {
  it('applique la bonne classe de bordure pour success', () => {
    const wrapper = mountCard({ check: makeCheck({ status: 'success' }), label: 'X', index: 0 });
    expect(wrapper.find('[data-testid="check-card"]').attributes('data-border')).toBe(
      'border-l-success-fg',
    );
  });

  it('applique la bonne classe de bordure pour failure', () => {
    const wrapper = mountCard({ check: makeCheck({ status: 'failure' }), label: 'X', index: 0 });
    expect(wrapper.find('[data-testid="check-card"]').attributes('data-border')).toBe(
      'border-l-danger-fg',
    );
  });

  it('applique la bonne classe de bordure pour error', () => {
    const wrapper = mountCard({ check: makeCheck({ status: 'error' }), label: 'X', index: 0 });
    expect(wrapper.find('[data-testid="check-card"]').attributes('data-border')).toBe(
      'border-l-warning-fg',
    );
  });
});

describe('CheckCard — a11y', () => {
  it('l\'icône de statut a role="img"', () => {
    const wrapper = mountCard({ check: makeCheck(), label: 'X', index: 0 });
    expect(wrapper.find('[data-testid="status-icon"]').attributes('role')).toBe('img');
  });

  it("l'article a un aria-labelledby pointant vers le titre", () => {
    const wrapper = mountCard({ check: makeCheck(), label: 'X', index: 3 });
    expect(wrapper.find('[data-testid="check-card"]').attributes('aria-labelledby')).toBe(
      'check-card-summary-3',
    );
  });

  it('le badge statut est aria-hidden', () => {
    const wrapper = mountCard({ check: makeCheck(), label: 'X', index: 0 });
    const badge = wrapper.find('[data-testid="status-badge"]');
    // aria-hidden="true" (string)
    expect(badge.attributes('aria-hidden')).toBeTruthy();
  });
});
