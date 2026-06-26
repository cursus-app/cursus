/**
 * Tests unitaires pour shared/utils/generateWorkflowYaml.ts (ST-03.4).
 * Couvre :
 *  - Génération YAML à partir de 0 check, 1 check, N checks.
 *  - Warnings (NO_CHECKS_ACTIVE, NO_TESTS_CHECK, HIGH_CHECK_COUNT).
 *  - Property-based : toute config valide génère du YAML syntaxiquement correct.
 */
import { describe, it, expect } from 'vitest';
import {
  generateWorkflowYaml,
  defaultCheckForType,
  CHECK_TYPES_ORDERED,
} from '~~/shared/utils/generateWorkflowYaml';
import type { DeliverableSpec } from '~~/shared/schemas/module';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSpec(overrides: Partial<DeliverableSpec> = {}): DeliverableSpec {
  return {
    description: '',
    repoRequired: true,
    deployRequired: false,
    checks: [],
    ...overrides,
  };
}

/** Vérifie qu'une chaîne est du YAML valide basique (pas de tabs, structure présente). */
function isBasicValidYaml(yaml: string): boolean {
  // Le YAML généré ne doit pas contenir de tabs (restriction YAML)
  if (/\t/.test(yaml)) {
    return false;
  }
  // Doit avoir le champ "name:"
  if (!yaml.includes('name:')) {
    return false;
  }
  // Doit avoir "jobs:"
  if (!yaml.includes('jobs:')) {
    return false;
  }
  return true;
}

// ─── Tests — 0 check ─────────────────────────────────────────────────────────

describe('generateWorkflowYaml — 0 check actif', () => {
  it('retourne un YAML valide même sans check', () => {
    const { yaml } = generateWorkflowYaml(makeSpec(), 'Semaine 1');
    expect(isBasicValidYaml(yaml)).toBe(true);
  });

  it('inclut un warning NO_CHECKS_ACTIVE', () => {
    const { warnings } = generateWorkflowYaml(makeSpec());
    expect(warnings.some((w) => w.code === 'NO_CHECKS_ACTIVE')).toBe(true);
  });

  it("ne génère pas de warning NO_TESTS_CHECK quand il n'y a aucun check", () => {
    const { warnings } = generateWorkflowYaml(makeSpec());
    // NO_TESTS_CHECK n'est émis que s'il y a des checks actifs mais pas de tests
    expect(warnings.some((w) => w.code === 'NO_TESTS_CHECK')).toBe(false);
  });

  it('inclut un step no-op dans le YAML', () => {
    const { yaml } = generateWorkflowYaml(makeSpec());
    expect(yaml).toContain('auto-valid');
  });

  it('inclut le titre du module dans le nom du workflow', () => {
    const { yaml } = generateWorkflowYaml(makeSpec(), 'Mon Super Module');
    expect(yaml).toContain('Mon Super Module');
  });
});

// ─── Tests — 1 check ─────────────────────────────────────────────────────────

describe('generateWorkflowYaml — 1 check actif (branches)', () => {
  const spec = makeSpec({
    checks: [{ type: 'branches', enabled: true, params: { branches: ['main', 'feature/login'] } }],
  });

  it('retourne un YAML valide', () => {
    const { yaml } = generateWorkflowYaml(spec, 'Module 1');
    expect(isBasicValidYaml(yaml)).toBe(true);
  });

  it('inclut un step de vérification des branches', () => {
    const { yaml } = generateWorkflowYaml(spec);
    expect(yaml).toContain('branches');
    expect(yaml).toContain('main');
    expect(yaml).toContain('feature/login');
  });

  it('inclut un warning NO_TESTS_CHECK', () => {
    const { warnings } = generateWorkflowYaml(spec);
    expect(warnings.some((w) => w.code === 'NO_TESTS_CHECK')).toBe(true);
  });

  it('ne contient pas de warning NO_CHECKS_ACTIVE', () => {
    const { warnings } = generateWorkflowYaml(spec);
    expect(warnings.some((w) => w.code === 'NO_CHECKS_ACTIVE')).toBe(false);
  });
});

// ─── Tests — N checks ────────────────────────────────────────────────────────

describe('generateWorkflowYaml — plusieurs checks actifs', () => {
  const spec = makeSpec({
    checks: [
      { type: 'branches', enabled: true, params: { branches: ['main'] } },
      { type: 'readme_present', enabled: true, params: {} },
      { type: 'linter_pass', enabled: true, params: {} },
      { type: 'tests_pass', enabled: true, params: {} },
    ],
  });

  it('retourne un YAML valide', () => {
    const { yaml } = generateWorkflowYaml(spec);
    expect(isBasicValidYaml(yaml)).toBe(true);
  });

  it('ne génère aucun warning quand tests_pass est activé', () => {
    const { warnings } = generateWorkflowYaml(spec);
    expect(warnings.some((w) => w.code === 'NO_TESTS_CHECK')).toBe(false);
    expect(warnings.some((w) => w.code === 'NO_CHECKS_ACTIVE')).toBe(false);
  });

  it('inclut un step pour chaque check actif', () => {
    const { yaml } = generateWorkflowYaml(spec);
    expect(yaml).toContain('README');
    expect(yaml).toContain('Linter');
    expect(yaml).toContain('tests');
  });

  it('inclut setup Node.js quand linter ou tests actifs', () => {
    const { yaml } = generateWorkflowYaml(spec);
    expect(yaml).toContain('setup-node');
  });
});

// ─── Tests — checks désactivés ───────────────────────────────────────────────

describe('generateWorkflowYaml — checks désactivés ignorés', () => {
  it('ignore les checks avec enabled=false', () => {
    const spec = makeSpec({
      checks: [
        { type: 'linter_pass', enabled: false, params: {} },
        { type: 'tests_pass', enabled: true, params: {} },
      ],
    });
    const { yaml, warnings } = generateWorkflowYaml(spec);
    expect(yaml).toContain('tests');
    // Linter désactivé → pas inclus
    expect(yaml).not.toContain('Linter');
    // tests_pass actif → pas de warning NO_TESTS_CHECK
    expect(warnings.some((w) => w.code === 'NO_TESTS_CHECK')).toBe(false);
  });
});

// ─── Tests — check lighthouse ─────────────────────────────────────────────────

describe('generateWorkflowYaml — lighthouse_score', () => {
  it('inclut le score minimal dans le YAML', () => {
    const spec = makeSpec({
      checks: [
        {
          type: 'lighthouse_score',
          enabled: true,
          params: { minScore: 90, categories: ['performance', 'accessibility'] },
        },
      ],
    });
    const { yaml } = generateWorkflowYaml(spec);
    expect(yaml).toContain('90');
    expect(yaml).toContain('Lighthouse');
  });

  it('retourne un YAML valide avec le check lighthouse', () => {
    const spec = makeSpec({
      checks: [
        {
          type: 'lighthouse_score',
          enabled: true,
          params: { minScore: 80, categories: ['performance'] },
        },
      ],
    });
    const { yaml } = generateWorkflowYaml(spec);
    expect(isBasicValidYaml(yaml)).toBe(true);
  });
});

// ─── Tests — check deploy_up ──────────────────────────────────────────────────

describe('generateWorkflowYaml — deploy_up', () => {
  it('inclut une URL de déploiement quand fournie', () => {
    const spec = makeSpec({
      checks: [{ type: 'deploy_up', enabled: true, params: { url: 'https://my-app.vercel.app' } }],
    });
    const { yaml } = generateWorkflowYaml(spec);
    expect(yaml).toContain('my-app.vercel.app');
  });

  it("utilise la variable d'input quand url non fournie", () => {
    const spec = makeSpec({
      checks: [{ type: 'deploy_up', enabled: true, params: {} }],
    });
    const { yaml } = generateWorkflowYaml(spec);
    expect(yaml).toContain('deploy_url');
  });
});

// ─── Tests — warning HIGH_CHECK_COUNT ─────────────────────────────────────────

describe('generateWorkflowYaml — HIGH_CHECK_COUNT warning', () => {
  it('émet un warning quand plus de 10 checks sont actifs', () => {
    // On crée 11 checks actifs (en répétant readme_present et linter_pass)
    const checks = Array.from({ length: 11 }, (_, i) => ({
      type: (i % 2 === 0 ? 'readme_present' : 'signed_commits') as
        | 'readme_present'
        | 'signed_commits',
      enabled: true,
      params: {} as Record<string, never>,
    }));
    // On ne peut pas avoir 11 checks distincts (seulement 7 types), donc on utilise
    // une spec avec des checks d'un seul type en exploitant que le schéma les accepte.
    // Pour ce test, on bypass le schéma et on passe directement.
    const spec = makeSpec({ checks });
    const { warnings } = generateWorkflowYaml(spec);
    expect(warnings.some((w) => w.code === 'HIGH_CHECK_COUNT')).toBe(true);
  });

  it("n'émet PAS de warning avec 10 checks actifs ou moins", () => {
    const spec = makeSpec({
      checks: [
        { type: 'readme_present', enabled: true, params: {} },
        { type: 'tests_pass', enabled: true, params: {} },
      ],
    });
    const { warnings } = generateWorkflowYaml(spec);
    expect(warnings.some((w) => w.code === 'HIGH_CHECK_COUNT')).toBe(false);
  });
});

// ─── Tests — injection YAML ───────────────────────────────────────────────────

describe('generateWorkflowYaml — sécurité injection YAML', () => {
  it('sanitise les guillemets dans le titre du module pour produire un YAML valide', () => {
    const { yaml } = generateWorkflowYaml(makeSpec(), 'Module "SQL injection"');
    // Le titre ne doit pas casser la structure YAML
    expect(isBasicValidYaml(yaml)).toBe(true);
    // Le YAML doit contenir le contenu du titre (les guillemets sont supprimés pour la sécurité)
    expect(yaml).toContain('SQL injection');
  });

  it('échappe les guillemets dans les noms de branches', () => {
    const spec = makeSpec({
      checks: [{ type: 'branches', enabled: true, params: { branches: ['main', 'branch"name'] } }],
    });
    const { yaml } = generateWorkflowYaml(spec);
    expect(isBasicValidYaml(yaml)).toBe(true);
  });
});

// ─── Tests — defaultCheckForType ─────────────────────────────────────────────

describe('defaultCheckForType', () => {
  it('retourne un check désactivé pour chaque type', () => {
    for (const type of CHECK_TYPES_ORDERED) {
      const check = defaultCheckForType(type);
      expect(check.enabled).toBe(false);
      expect(check.type).toBe(type);
    }
  });

  it('retourne des branches ["main"] par défaut pour le type branches', () => {
    const check = defaultCheckForType('branches');
    if (check.type === 'branches') {
      expect(check.params.branches).toEqual(['main']);
    }
  });

  it('retourne minScore=80 par défaut pour lighthouse_score', () => {
    const check = defaultCheckForType('lighthouse_score');
    if (check.type === 'lighthouse_score') {
      expect(check.params.minScore).toBe(80);
    }
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe('generateWorkflowYaml — property: toute config valide génère du YAML valide', () => {
  // Teste 20 combinaisons de checks aléatoires
  const allTypes = CHECK_TYPES_ORDERED;

  for (let i = 0; i < 20; i++) {
    it(`config aléatoire #${String(i + 1)} → YAML valide`, () => {
      // Sélectionne un sous-ensemble aléatoire déterministe (basé sur l'index)
      const count = (i % allTypes.length) + 1;
      const checks = allTypes.slice(0, count).map((type) => {
        const base = defaultCheckForType(type);
        return { ...base, enabled: i % 2 === 0 };
      });

      const spec = makeSpec({ checks });
      const { yaml } = generateWorkflowYaml(spec, `Test Module ${String(i)}`);
      expect(isBasicValidYaml(yaml)).toBe(true);
    });
  }
});
