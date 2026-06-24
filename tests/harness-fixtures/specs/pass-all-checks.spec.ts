import { describe, expect, it } from 'vitest';
import { HARNESS_FIXTURES } from '../fixtures.config';
import { isHarnessConfigured, runHarnessAgainst } from './helpers';

const fixture = HARNESS_FIXTURES.find((f) => f.name === 'pass-all-checks');
if (!fixture) {
  throw new Error('Fixture "pass-all-checks" introuvable dans fixtures.config.ts');
}

const FIXTURE_TIMEOUT_MS = fixture.maxDurationMs ?? 6 * 60 * 1000;

describe.skipIf(!isHarnessConfigured())(`Harness fixture: ${fixture.name}`, () => {
  it(
    'tous les checks en vert → statut validated',
    async () => {
      const result = await runHarnessAgainst(fixture.repoUrl, {
        timeoutMs: FIXTURE_TIMEOUT_MS,
      });

      expect(result.status).toBe<typeof result.status>('validated');
      expect(result.failedChecks).toHaveLength(0);
      expect(result.durationMs).toBeLessThan(FIXTURE_TIMEOUT_MS);
    },
    10 * 60 * 1000,
  );
});
