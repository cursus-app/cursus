import { describe, expect, it } from 'vitest'
import { HARNESS_FIXTURES } from '../fixtures.config'
import { isHarnessConfigured, runHarnessAgainst } from './helpers'

const fixture = HARNESS_FIXTURES.find((f) => f.name === 'linter-fails')!

describe.skipIf(!isHarnessConfigured())(`Harness fixture: ${fixture.name}`, () => {
  it(
    'check linter rouge → statut failed',
    async () => {
      const result = await runHarnessAgainst(fixture.repoUrl)

      expect(result.status).toBe<typeof result.status>('failed')
      expect(result.failedChecks).toContain('linter')
    },
    10 * 60 * 1000,
  )
})
