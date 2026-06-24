export interface FixtureConfig {
  name: string
  repoUrl: string
  expectedStatus: 'validated' | 'failed'
  expectedFailedChecks?: string[]
  maxDurationMs?: number
}

export const HARNESS_FIXTURES: FixtureConfig[] = [
  {
    name: 'pass-all-checks',
    repoUrl: 'https://github.com/cursus-fixtures/pass-all-checks',
    expectedStatus: 'validated',
    maxDurationMs: 6 * 60 * 1000,
  },
  {
    name: 'missing-branch',
    repoUrl: 'https://github.com/cursus-fixtures/missing-branch',
    expectedStatus: 'failed',
    expectedFailedChecks: ['branch_exists'],
  },
  {
    name: 'missing-signed-commit',
    repoUrl: 'https://github.com/cursus-fixtures/missing-signed-commit',
    expectedStatus: 'failed',
    expectedFailedChecks: ['signed_commits'],
  },
  {
    name: 'deploy-down',
    repoUrl: 'https://github.com/cursus-fixtures/deploy-down',
    expectedStatus: 'failed',
    expectedFailedChecks: ['deploy_url_responds'],
  },
  {
    name: 'linter-fails',
    repoUrl: 'https://github.com/cursus-fixtures/linter-fails',
    expectedStatus: 'failed',
    expectedFailedChecks: ['linter'],
  },
  {
    name: 'tests-fail',
    repoUrl: 'https://github.com/cursus-fixtures/tests-fail',
    expectedStatus: 'failed',
    expectedFailedChecks: ['tests'],
  },
  {
    name: 'no-readme',
    repoUrl: 'https://github.com/cursus-fixtures/no-readme',
    expectedStatus: 'failed',
    expectedFailedChecks: ['readme_exists'],
  },
  {
    name: 'lighthouse-low',
    repoUrl: 'https://github.com/cursus-fixtures/lighthouse-low',
    expectedStatus: 'failed',
    expectedFailedChecks: ['lighthouse_score'],
  },
]
