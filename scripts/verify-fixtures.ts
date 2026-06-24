/**
 * Vérifie que tous les repos fixtures existent sur GitHub et sont accessibles.
 *
 * Usage :
 *   pnpm tsx scripts/verify-fixtures.ts
 *
 * Variables d'environnement :
 *   GITHUB_TOKEN (optionnel) — Personal Access Token ou token GITHUB_TOKEN CI.
 *                              Sans token, l'API GitHub est en mode non authentifié
 *                              (rate limit plus bas : 60 req/h).
 */

import { HARNESS_FIXTURES } from '../tests/harness-fixtures/fixtures.config'

interface VerifyResult {
  name: string
  exists: boolean
  url: string
}

async function verifyFixtures(): Promise<void> {
  const results: VerifyResult[] = []

  for (const fixture of HARNESS_FIXTURES) {
    const apiUrl = fixture.repoUrl.replace(
      'https://github.com/',
      'https://api.github.com/repos/',
    )

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    const githubToken = process.env['GITHUB_TOKEN']
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`
    }

    try {
      const response = await fetch(apiUrl, { headers })
      results.push({ name: fixture.name, exists: response.ok, url: fixture.repoUrl })
    } catch {
      results.push({ name: fixture.name, exists: false, url: fixture.repoUrl })
    }
  }

  console.table(results)

  const missing = results.filter((r) => !r.exists)
  if (missing.length > 0) {
    console.error(`\n${missing.length} fixture(s) manquante(s) :`)
    for (const m of missing) {
      console.error(`  - ${m.name}: ${m.url}`)
    }
    process.exit(1)
  } else {
    console.log(`\nToutes les ${results.length} fixtures sont accessibles.`)
  }
}

verifyFixtures()
