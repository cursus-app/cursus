import { describe, expect, it } from 'vitest'
import { HARNESS_FIXTURES } from '../fixtures.config'
import { isHarnessConfigured, runHarnessAgainst } from './helpers'

const fixture = HARNESS_FIXTURES.find((f) => f.name === 'deploy-down')
if (!fixture) { throw new Error('Fixture "deploy-down" introuvable dans fixtures.config.ts') }

describe.skipIf(!isHarnessConfigured())(`Harness fixture: ${fixture.name}`, () => {
  it(
    'check deploy_url_responds rouge quand URL répond 503 → statut failed',
    async () => {
      const result = await runHarnessAgainst(fixture.repoUrl)

      expect(result.status).toBe<typeof result.status>('failed')
      expect(result.failedChecks).toContain('deploy_url_responds')
    },
    10 * 60 * 1000,
  )
})
