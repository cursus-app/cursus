## Pourquoi

<!-- Lien JIRA (CUR-XXX) + contexte 2-3 lignes. Cf. 09-engineering-playbook §1.4 -->

## Quoi

<!-- Ce qui change concrètement. Liste à puces si plusieurs choses. -->

## Comment tester

<!-- Étapes reproductibles en local. -->

```bash
# Exemple
pnpm install
pnpm dev
# Aller sur /xxx, cliquer sur yyy, observer zzz
```

## Captures / vidéo

<!-- Si UI changée. Light + Dark mode. -->

## Checklist (Definition of Done)

- [ ] Acceptance criteria de la story remplis
- [ ] Tests unitaires ajoutés ou existants couvrent (≥ 80% sur le code modifié)
- [ ] Tests E2E mis à jour si parcours touché
- [ ] Typecheck strict passe (`pnpm typecheck`)
- [ ] Lint + format propres (`pnpm lint && pnpm format:check`)
- [ ] Documentation mise à jour si nécessaire (README, ADR, runbook)
- [ ] A11y vérifiée (clavier, contraste AA, ARIA si icon-only)
- [ ] Perf budget respecté (Lighthouse CI vert)
- [ ] RLS policies vérifiées si la PR touche la DB
- [ ] Pas de PII dans les logs (Pino redaction OK)
- [ ] OWASP Top 10 mentalisé (cf. 09-engineering-playbook §6.1)
- [ ] Changeset ajouté si feature visible utilisateur
- [ ] Pas de `any`, pas de `@ts-ignore` non commenté
- [ ] Pas de `new PrismaClient()` hors `server/utils/prisma.ts`

## Notes pour le reviewer

<!-- Points d'attention spécifiques, alternatives écartées, suite prévue. -->
