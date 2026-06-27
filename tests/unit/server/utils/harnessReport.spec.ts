// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  parseHarnessReport,
  getCheckLabel,
  getCheckHelpMessage,
} from '~~/server/utils/harnessReport';
import { KNOWN_CHECK_IDS } from '~~/shared/types/harness';

vi.mock('~~/server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── parseHarnessReport ────────────────────────────────────────────────────────

describe('parseHarnessReport', () => {
  describe('entrées valides', () => {
    it('retourne un rapport complet avec summary recalculé', () => {
      const input = {
        checks: [
          { checkId: 'repo_exists_public', status: 'success', message: 'OK' },
          { checkId: 'branch_exists', status: 'failure', message: 'Branche absente' },
          { checkId: 'tests_pass', status: 'skipped', message: 'Skipped' },
        ],
        summary: { passed: 0, failed: 0, skipped: 0, total: 0 }, // intentionnellement faux
        completedAt: '2026-06-27T10:00:00Z',
      };

      const report = parseHarnessReport(input);

      expect(report.checks).toHaveLength(3);
      // Le summary doit être recalculé, pas celui du payload
      expect(report.summary.passed).toBe(1);
      expect(report.summary.failed).toBe(1);
      expect(report.summary.skipped).toBe(1);
      expect(report.summary.total).toBe(3);
      expect(report.completedAt).toBe('2026-06-27T10:00:00Z');
    });

    it('compte "error" et "failure" comme failed', () => {
      const input = {
        checks: [
          { checkId: 'tests_pass', status: 'failure', message: 'Tests KO' },
          { checkId: 'linter_pass', status: 'error', message: 'Timeout' },
          { checkId: 'url_responds', status: 'success', message: 'OK' },
          { checkId: 'lighthouse_min', status: 'pending', message: 'En attente' },
        ],
        summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
      };

      const report = parseHarnessReport(input);

      expect(report.summary.passed).toBe(1);
      expect(report.summary.failed).toBe(2);
      expect(report.summary.skipped).toBe(1); // pending → skipped
      expect(report.summary.total).toBe(4);
    });

    it('accepte les champs optionnels (details, durationMs)', () => {
      const input = {
        checks: [
          {
            checkId: 'lighthouse_min',
            status: 'success',
            message: 'Scores OK',
            details: { performance: 95, accessibility: 100 },
            durationMs: 12500,
          },
        ],
        summary: { passed: 1, failed: 0, skipped: 0, total: 1 },
      };

      const report = parseHarnessReport(input);

      expect(report.checks[0]?.details).toEqual({ performance: 95, accessibility: 100 });
      expect(report.checks[0]?.durationMs).toBe(12500);
    });

    it('fonctionne avec une liste de checks vide', () => {
      const input = {
        checks: [],
        summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
      };

      const report = parseHarnessReport(input);

      expect(report.checks).toHaveLength(0);
      expect(report.summary).toEqual({ passed: 0, failed: 0, skipped: 0, total: 0 });
    });
  });

  describe('entrées nulles / undefined', () => {
    it('retourne un rapport vide pour null', () => {
      const report = parseHarnessReport(null);

      expect(report.checks).toHaveLength(0);
      expect(report.summary).toEqual({ passed: 0, failed: 0, skipped: 0, total: 0 });
      expect(report.completedAt).toBeUndefined();
    });

    it('retourne un rapport vide pour undefined', () => {
      const report = parseHarnessReport(undefined);

      expect(report.checks).toHaveLength(0);
      expect(report.summary.total).toBe(0);
    });
  });

  describe('entrées malformées', () => {
    it('retourne un rapport vide pour un objet sans checks', () => {
      const report = parseHarnessReport({ foo: 'bar' });

      expect(report.checks).toHaveLength(0);
      expect(report.summary.total).toBe(0);
    });

    it('retourne un rapport vide pour une chaîne', () => {
      const report = parseHarnessReport('not-an-object');

      expect(report.checks).toHaveLength(0);
    });

    it('retourne un rapport vide pour un tableau (pas un objet)', () => {
      const report = parseHarnessReport([{ checkId: 'repo_exists_public', status: 'success' }]);

      expect(report.checks).toHaveLength(0);
    });

    it('retourne un rapport vide si un check a un statut invalide', () => {
      const input = {
        checks: [{ checkId: 'repo_exists_public', status: 'invalid_status', message: 'bad' }],
        summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
      };

      const report = parseHarnessReport(input);

      expect(report.checks).toHaveLength(0);
    });

    it('retourne un rapport vide si checkId est vide', () => {
      const input = {
        checks: [{ checkId: '', status: 'success', message: 'OK' }],
        summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
      };

      const report = parseHarnessReport(input);

      expect(report.checks).toHaveLength(0);
    });

    it('retourne un rapport vide si durationMs est négatif', () => {
      const input = {
        checks: [{ checkId: 'tests_pass', status: 'success', message: 'OK', durationMs: -100 }],
        summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
      };

      const report = parseHarnessReport(input);

      expect(report.checks).toHaveLength(0);
    });

    it('loggue un warn en cas de données corrompues', async () => {
      const { logger } = await import('~~/server/utils/logger');
      vi.mocked(logger.warn).mockClear();

      parseHarnessReport({ checks: 'not-an-array' });

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'harness.report.parse_error' }),
        expect.any(String),
      );
    });
  });

  describe('calcul du summary', () => {
    it('summary total = nb de checks', () => {
      const input = {
        checks: Array.from({ length: 9 }, (_, i) => ({
          checkId: KNOWN_CHECK_IDS[i] ?? 'unknown',
          status: 'success' as const,
          message: 'OK',
        })),
        summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
      };

      const report = parseHarnessReport(input);

      expect(report.summary.total).toBe(9);
      expect(report.summary.passed).toBe(9);
      expect(report.summary.failed).toBe(0);
      expect(report.summary.skipped).toBe(0);
    });

    it('summary passed + failed + skipped = total', () => {
      const statuses = ['success', 'failure', 'error', 'skipped', 'pending', 'success'] as const;
      const input = {
        checks: statuses.map((status, i) => ({
          checkId: `check_${i}`,
          status,
          message: `result ${i}`,
        })),
        summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
      };

      const report = parseHarnessReport(input);

      const { passed, failed, skipped, total } = report.summary;
      expect(passed + failed + skipped).toBe(total);
    });
  });
});

// ─── getCheckLabel ─────────────────────────────────────────────────────────────

describe('getCheckLabel', () => {
  it('retourne le libellé FR pour tous les checks connus', () => {
    const expectedFr: Record<string, string> = {
      repo_exists_public: 'Dépôt public accessible',
      branch_exists: 'Branches requises présentes',
      pr_merged: 'Pull Request fusionnée',
      file_exists: 'Fichier obligatoire présent',
      tests_pass: 'Tests unitaires',
      linter_pass: 'Linter (qualité du code)',
      url_responds: 'URL de déploiement accessible',
      lighthouse_min: 'Score Lighthouse minimum',
      commits_signed: 'Commits signés (GPG)',
    };

    for (const checkId of KNOWN_CHECK_IDS) {
      expect(getCheckLabel(checkId, 'fr')).toBe(expectedFr[checkId]);
    }
  });

  it('retourne le libellé EN pour tous les checks connus', () => {
    const expectedEn: Record<string, string> = {
      repo_exists_public: 'Public repository accessible',
      branch_exists: 'Required branches present',
      pr_merged: 'Pull Request merged',
      file_exists: 'Required file present',
      tests_pass: 'Unit tests',
      linter_pass: 'Linter (code quality)',
      url_responds: 'Deployment URL accessible',
      lighthouse_min: 'Minimum Lighthouse score',
      commits_signed: 'Signed commits (GPG)',
    };

    for (const checkId of KNOWN_CHECK_IDS) {
      expect(getCheckLabel(checkId, 'en')).toBe(expectedEn[checkId]);
    }
  });

  it('retourne le checkId brut pour un ID inconnu', () => {
    expect(getCheckLabel('unknown_check', 'fr')).toBe('unknown_check');
    expect(getCheckLabel('unknown_check', 'en')).toBe('unknown_check');
  });

  it('couvre les 9 check IDs connus (MVP)', () => {
    expect(KNOWN_CHECK_IDS).toHaveLength(9);

    for (const checkId of KNOWN_CHECK_IDS) {
      const labelFr = getCheckLabel(checkId, 'fr');
      const labelEn = getCheckLabel(checkId, 'en');
      expect(labelFr).not.toBe(checkId); // doit avoir un vrai libellé
      expect(labelEn).not.toBe(checkId);
      expect(labelFr.length).toBeGreaterThan(3);
      expect(labelEn.length).toBeGreaterThan(3);
    }
  });
});

// ─── getCheckHelpMessage ───────────────────────────────────────────────────────

describe('getCheckHelpMessage', () => {
  it("retourne un message d'aide FR non vide pour tous les checks", () => {
    for (const checkId of KNOWN_CHECK_IDS) {
      const help = getCheckHelpMessage(checkId, 'fr');
      expect(help.length).toBeGreaterThan(10);
    }
  });

  it("retourne un message d'aide EN non vide pour tous les checks", () => {
    for (const checkId of KNOWN_CHECK_IDS) {
      const help = getCheckHelpMessage(checkId, 'en');
      expect(help.length).toBeGreaterThan(10);
    }
  });

  it('retourne une chaîne vide pour un ID inconnu', () => {
    expect(getCheckHelpMessage('not_a_real_check', 'fr')).toBe('');
    expect(getCheckHelpMessage('not_a_real_check', 'en')).toBe('');
  });

  it('les messages FR et EN sont différents (pas de copier-coller)', () => {
    for (const checkId of KNOWN_CHECK_IDS) {
      const helpFr = getCheckHelpMessage(checkId, 'fr');
      const helpEn = getCheckHelpMessage(checkId, 'en');
      expect(helpFr).not.toBe(helpEn);
    }
  });

  it('les messages contiennent des instructions actionnables (verbes impératifs)', () => {
    // Spot-check sur quelques checks critiques
    expect(getCheckHelpMessage('repo_exists_public', 'fr')).toMatch(/assurez-vous/i);
    expect(getCheckHelpMessage('tests_pass', 'fr')).toMatch(/lancez/i);
    expect(getCheckHelpMessage('commits_signed', 'en')).toMatch(/configure/i);
  });
});
