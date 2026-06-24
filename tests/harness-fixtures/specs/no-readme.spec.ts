import { describe, expect, it } from 'vitest'
import { HARNESS_FIXTURES } from '../fixtures.config'
import { isHarnessConfigured, runHarnessAgainst } from './helpers'

const fixture = HARNESS_FIXTURES.find((f) => f.name === 'no-readme')
if (!fixture) { throw new Error('Fixture "no-readme" introuvable dans fixtures.config.ts') }

describe.skipIf(!isHarnessConfigured())(`Harness fixture: ${fixture.name}`, () => {
  it(
    'check readme_exists rouge → statut failed',
    async () => {
      const result = await runHarnessAgainst(fixture.repoUrl)

      expect(result.status).toBe<typeof result.status>('failed')
      expect(result.failedChecks).toContain('readme_exists')
    },
    10 * 60 * 1000,
  )
})
