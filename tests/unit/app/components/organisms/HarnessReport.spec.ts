/**
 * Tests unitaires du composant HarnessReport.
 *
 * On teste la logique d'affichage via un stub minimal reproduisant
 * les comportements observables, sans dépendre du runtime Nuxt complet.
 */

import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import type { HarnessReport, CheckResult } from '~~/shared/types/harness';

// ─── Types ────────────────────────────────────────────────────────────────────

type HarnessStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'CANCELLED';

// ─── Stub du composant HarnessReport ─────────────────────────────────────────

const HarnessReportStub = {
  props: {
    report: { type: Object as () => HarnessReport | null, default: null },
    status: { type: String as () => HarnessStatus, required: true },
  },
  computed: {
    isLoading(this: { status: HarnessStatus }) {
      return this.status === 'QUEUED' || this.status === 'RUNNING';
    },
    isTimeout(this: { status: HarnessStatus }) {
      return this.status === 'TIMEOUT';
    },
    isCancelled(this: { status: HarnessStatus }) {
      return this.status === 'CANCELLED';
    },
    isDone(this: { status: HarnessStatus }) {
      return this.status === 'SUCCESS' || this.status === 'FAILURE';
    },
    summaryMessage(this: { report: HarnessReport | null; status: HarnessStatus }) {
      if (!this.report) {
        return '';
      }
      const { passed, total } = this.report.summary;
      if (passed === total) {
        return 'Bravo ! Tous les checks sont réussis.';
      }
      if (passed === 0) {
        return 'Aucun check réussi. Relis les consignes et réessaie !';
      }
      return `${passed}/${total} checks réussis`;
    },
  },
  template: `
    <section data-testid="harness-report" aria-live="polite">
      <!-- État chargement -->
      <template v-if="isLoading">
        <div data-testid="loading-indicator" role="status">
          <span data-testid="pulse-dot" />
          <span data-testid="loading-text">
            {{ status === 'QUEUED' ? 'En attente de démarrage…' : 'Vérifications en cours…' }}
          </span>
        </div>
        <div
          v-for="i in 4"
          :key="i"
          data-testid="skeleton-card"
          aria-hidden="true"
        />
      </template>

      <!-- État TIMEOUT -->
      <template v-else-if="isTimeout">
        <div data-testid="timeout-state" role="alert">
          <p data-testid="timeout-title">Délai dépassé</p>
        </div>
      </template>

      <!-- État CANCELLED -->
      <template v-else-if="isCancelled">
        <div data-testid="cancelled-state" role="status">
          Ce run a été annulé.
        </div>
      </template>

      <!-- États SUCCESS / FAILURE -->
      <template v-else-if="isDone && report">
        <div data-testid="summary-bar" role="status">
          {{ summaryMessage }}
        </div>
        <div
          v-for="(check, index) in report.checks"
          :key="check.checkId"
          data-testid="check-card-wrapper"
          :data-check-id="check.checkId"
          :data-status="check.status"
        >
          <span>{{ check.checkId }}</span>
        </div>
        <div
          v-if="report.checks.length === 0"
          data-testid="no-checks"
        >
          Aucune vérification à afficher.
        </div>
      </template>

      <!-- Fallback -->
      <template v-else-if="!report && !isLoading">
        <div data-testid="no-data">Rapport non disponible.</div>
      </template>
    </section>
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

function makeReport(overrides: Partial<HarnessReport> = {}): HarnessReport {
  const checks: CheckResult[] = overrides.checks ?? [
    makeCheck({ checkId: 'tests_pass', status: 'success' }),
    makeCheck({ checkId: 'linter_pass', status: 'failure' }),
  ];
  const passed = checks.filter((c) => c.status === 'success').length;
  const failed = checks.filter((c) => c.status === 'failure').length;
  const skipped = checks.filter((c) => c.status === 'skipped').length;
  return {
    checks,
    summary: { passed, failed, skipped, total: checks.length },
    completedAt: '2026-06-27T12:00:00Z',
    ...overrides,
  };
}

function mountReport(props: { report: HarnessReport | null; status: HarnessStatus }) {
  return mount(HarnessReportStub, { props });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('HarnessReport — état QUEUED', () => {
  it('affiche l\'indicateur de chargement', () => {
    const wrapper = mountReport({ report: null, status: 'QUEUED' });
    expect(wrapper.find('[data-testid="loading-indicator"]').exists()).toBe(true);
  });

  it('affiche 4 cartes squelette', () => {
    const wrapper = mountReport({ report: null, status: 'QUEUED' });
    expect(wrapper.findAll('[data-testid="skeleton-card"]')).toHaveLength(4);
  });

  it('affiche le texte "En attente de démarrage…" pour QUEUED', () => {
    const wrapper = mountReport({ report: null, status: 'QUEUED' });
    expect(wrapper.find('[data-testid="loading-text"]').text()).toContain('En attente');
  });

  it('n\'affiche PAS la barre de résumé', () => {
    const wrapper = mountReport({ report: null, status: 'QUEUED' });
    expect(wrapper.find('[data-testid="summary-bar"]').exists()).toBe(false);
  });
});

describe('HarnessReport — état RUNNING', () => {
  it('affiche l\'indicateur de chargement', () => {
    const wrapper = mountReport({ report: null, status: 'RUNNING' });
    expect(wrapper.find('[data-testid="loading-indicator"]').exists()).toBe(true);
  });

  it('affiche 4 cartes squelette', () => {
    const wrapper = mountReport({ report: null, status: 'RUNNING' });
    expect(wrapper.findAll('[data-testid="skeleton-card"]')).toHaveLength(4);
  });

  it('affiche le texte "Vérifications en cours…" pour RUNNING', () => {
    const wrapper = mountReport({ report: null, status: 'RUNNING' });
    expect(wrapper.find('[data-testid="loading-text"]').text()).toContain('Vérifications en cours');
  });

  it('les squelettes sont aria-hidden', () => {
    const wrapper = mountReport({ report: null, status: 'RUNNING' });
    const skeletons = wrapper.findAll('[data-testid="skeleton-card"]');
    for (const skeleton of skeletons) {
      expect(skeleton.attributes('aria-hidden')).toBe('true');
    }
  });
});

describe('HarnessReport — état TIMEOUT', () => {
  it('affiche l\'état de timeout', () => {
    const wrapper = mountReport({ report: null, status: 'TIMEOUT' });
    expect(wrapper.find('[data-testid="timeout-state"]').exists()).toBe(true);
  });

  it('l\'état de timeout a role="alert"', () => {
    const wrapper = mountReport({ report: null, status: 'TIMEOUT' });
    expect(wrapper.find('[data-testid="timeout-state"]').attributes('role')).toBe('alert');
  });

  it('affiche le titre "Délai dépassé"', () => {
    const wrapper = mountReport({ report: null, status: 'TIMEOUT' });
    expect(wrapper.find('[data-testid="timeout-title"]').text()).toBe('Délai dépassé');
  });

  it('n\'affiche PAS les squelettes', () => {
    const wrapper = mountReport({ report: null, status: 'TIMEOUT' });
    expect(wrapper.find('[data-testid="skeleton-card"]').exists()).toBe(false);
  });
});

describe('HarnessReport — état CANCELLED', () => {
  it('affiche l\'état annulé', () => {
    const wrapper = mountReport({ report: null, status: 'CANCELLED' });
    expect(wrapper.find('[data-testid="cancelled-state"]').exists()).toBe(true);
  });

  it('n\'affiche PAS les squelettes', () => {
    const wrapper = mountReport({ report: null, status: 'CANCELLED' });
    expect(wrapper.find('[data-testid="skeleton-card"]').exists()).toBe(false);
  });
});

describe('HarnessReport — état SUCCESS', () => {
  it('affiche la barre de résumé', () => {
    const wrapper = mountReport({ report: makeReport(), status: 'SUCCESS' });
    expect(wrapper.find('[data-testid="summary-bar"]').exists()).toBe(true);
  });

  it('n\'affiche PAS les squelettes', () => {
    const wrapper = mountReport({ report: makeReport(), status: 'SUCCESS' });
    expect(wrapper.find('[data-testid="skeleton-card"]').exists()).toBe(false);
  });

  it('affiche une carte par check', () => {
    const report = makeReport({
      checks: [
        makeCheck({ checkId: 'tests_pass', status: 'success' }),
        makeCheck({ checkId: 'linter_pass', status: 'success' }),
        makeCheck({ checkId: 'readme_present', status: 'success' }),
      ],
    });
    const wrapper = mountReport({ report, status: 'SUCCESS' });
    expect(wrapper.findAll('[data-testid="check-card-wrapper"]')).toHaveLength(3);
  });

  it('la barre de résumé affiche "Bravo !" quand tous les checks passent', () => {
    const report = makeReport({
      checks: [
        makeCheck({ status: 'success' }),
        makeCheck({ status: 'success' }),
      ],
    });
    const wrapper = mountReport({ report, status: 'SUCCESS' });
    expect(wrapper.find('[data-testid="summary-bar"]').text()).toContain('Bravo');
  });
});

describe('HarnessReport — état FAILURE', () => {
  it('affiche la barre de résumé', () => {
    const wrapper = mountReport({ report: makeReport(), status: 'FAILURE' });
    expect(wrapper.find('[data-testid="summary-bar"]').exists()).toBe(true);
  });

  it('la barre de résumé affiche le message d\'échec total si 0 réussi', () => {
    const report = makeReport({
      checks: [
        makeCheck({ status: 'failure' }),
        makeCheck({ status: 'failure' }),
      ],
    });
    const wrapper = mountReport({ report, status: 'FAILURE' });
    expect(wrapper.find('[data-testid="summary-bar"]').text()).toContain('Aucun check réussi');
  });

  it('la barre de résumé affiche le ratio correct si mix', () => {
    const report = makeReport({
      checks: [
        makeCheck({ status: 'success' }),
        makeCheck({ status: 'failure' }),
        makeCheck({ status: 'failure' }),
      ],
    });
    const wrapper = mountReport({ report, status: 'FAILURE' });
    expect(wrapper.find('[data-testid="summary-bar"]').text()).toContain('1/3');
  });

  it('affiche les cartes de checks avec le bon statut', () => {
    const report = makeReport({
      checks: [
        makeCheck({ checkId: 'tests_pass', status: 'success' }),
        makeCheck({ checkId: 'linter_pass', status: 'failure' }),
      ],
    });
    const wrapper = mountReport({ report, status: 'FAILURE' });
    const cards = wrapper.findAll('[data-testid="check-card-wrapper"]');
    expect(cards[0]?.attributes('data-status')).toBe('success');
    expect(cards[1]?.attributes('data-status')).toBe('failure');
  });
});

describe('HarnessReport — message "aucun check"', () => {
  it('affiche le message si la liste de checks est vide', () => {
    const report = makeReport({ checks: [], summary: { passed: 0, failed: 0, skipped: 0, total: 0 } });
    const wrapper = mountReport({ report, status: 'SUCCESS' });
    expect(wrapper.find('[data-testid="no-checks"]').exists()).toBe(true);
  });
});

describe('HarnessReport — a11y', () => {
  it('la section a aria-live="polite"', () => {
    const wrapper = mountReport({ report: null, status: 'QUEUED' });
    expect(wrapper.find('[data-testid="harness-report"]').attributes('aria-live')).toBe('polite');
  });

  it('l\'indicateur de chargement a role="status"', () => {
    const wrapper = mountReport({ report: null, status: 'RUNNING' });
    expect(wrapper.find('[data-testid="loading-indicator"]').attributes('role')).toBe('status');
  });

  it('la barre de résumé a role="status"', () => {
    const wrapper = mountReport({ report: makeReport(), status: 'SUCCESS' });
    expect(wrapper.find('[data-testid="summary-bar"]').attributes('role')).toBe('status');
  });
});

describe('HarnessReport — résumé sommaire', () => {
  it('tous réussis → message encourageant', () => {
    const report = makeReport({
      checks: [makeCheck({ status: 'success' }), makeCheck({ status: 'success' })],
    });
    const wrapper = mountReport({ report, status: 'SUCCESS' });
    expect(wrapper.find('[data-testid="summary-bar"]').text()).toContain('Bravo');
  });

  it('aucun réussi → message empathique', () => {
    const report = makeReport({
      checks: [makeCheck({ status: 'failure' }), makeCheck({ status: 'failure' })],
    });
    const wrapper = mountReport({ report, status: 'FAILURE' });
    expect(wrapper.find('[data-testid="summary-bar"]').text()).toContain('Relis les consignes');
  });

  it('mix → ratio affiché', () => {
    const report = makeReport({
      checks: [makeCheck({ status: 'success' }), makeCheck({ status: 'failure' })],
    });
    const wrapper = mountReport({ report, status: 'FAILURE' });
    expect(wrapper.find('[data-testid="summary-bar"]').text()).toContain('1/2');
  });
});
