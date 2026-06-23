# 15 — Design System Cursus : référence Claude Design à importer

> **Sauvegarde** des références au design system généré par Claude Design pour
> Cursus. **À NE PAS IMPORTER MAINTENANT** — ce document conserve les infos
> nécessaires pour brancher le DS au moment opportun (typiquement en début de
> sprint EP-18, ou juste avant la première story UI).

---

## 1 · Identité du design system

| Champ                           | Valeur                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Nom du fichier**              | `Cursus Design System.dc.html`                                                                    |
| **URL du projet Claude Design** | https://claude.ai/design/p/d8818aeb-82da-48d1-9273-ac7477ca79ad?file=Cursus+Design+System.dc.html |
| **ID Claude Design**            | `d8818aeb-82da-48d1-9273-ac7477ca79ad`                                                            |
| **Généré le**                   | 2026-06-21                                                                                        |
| **Brief source**                | `docs/product/14-claude-design-prompt.md`                                                         |

---

## 2 · MCP `claude_design` — comment le brancher

Le design system se télécharge via le **MCP connector `claude_design`**
(serveur : `https://api.anthropic.com/v1/design/mcp`). Il faut l'autoriser
avant le premier import.

### 2.1 — Connecter le MCP dans Claude Code

```bash
# Lance Claude Code dans le repo
cd /Users/sadjad/Dev/perso/cursus
claude

# Dans la session Claude Code, exécute le slash command :
/design-login
```

Le navigateur s'ouvre, tu accordes les scopes `user:design:read` et
`user:design:write` (pour pouvoir aussi pusher des modifs si besoin), tu
retournes dans Claude Code, le MCP est connecté.

Vérification :

```
> Liste les MCP connectés et vérifie que claude_design répond.
```

### 2.2 — Si tu utilises Claude Code dans Cursor / un autre client

Le serveur MCP est le même : `https://api.anthropic.com/v1/design/mcp`. Le
flow d'autorisation passe toujours par OAuth Anthropic. Le client doit
supporter les MCP avec auth OAuth (Claude Code natif le fait).

---

## 3 · Workflow d'import (à exécuter au moment opportun)

Quand on sera prêt à implémenter le design system (typiquement story ST-18.1
"Design tokens" du backlog), exécuter cette séquence :

### 3.1 — Demander à Claude Code de tout faire

Dans une session `claude` à la racine du repo :

```
Importe le design system Cursus depuis Claude Design.

URL du projet : https://claude.ai/design/p/d8818aeb-82da-48d1-9273-ac7477ca79ad
Fichier : Cursus Design System.dc.html

Étapes attendues :
1. Vérifie que le MCP claude_design est connecté (sinon : /design-login)
2. Récupère le fichier Cursus Design System.dc.html via les tools claude_design
3. Extrait les tokens CSS (palette OKLCH light + dark, espacements, radius,
   shadows, typographie, durations, z-index)
4. Colle-les dans assets/css/main.css dans un bloc @theme Tailwind v4 propre
5. Extrait les composants HTML/CSS de référence et stocke-les dans
   docs/design/claude-design-export/components/ (1 fichier par composant)
6. Extrait les maquettes-clés et stocke-les dans
   docs/design/claude-design-export/mockups/
7. Crée docs/design/claude-design-export/tokens.md qui consigne la version
   textuelle des tokens (référence)
8. Crée docs/design/claude-design-export/README.md qui résume la source, la
   date d'import, la version
9. Vérifie la cohérence : aucun token ne reste en dur dans le code existant,
   harmonise public/branding/palette.md et public/landing/index.html avec
   les couleurs définitives
10. Ouvre une PR feat(design-system): import initial Claude Design avec :
    - Tous les fichiers ci-dessus
    - Mise à jour CLAUDE.md section "Design system — RÈGLE NON NÉGOCIABLE"
    - Mise à jour .claude/agents/code-writer.md et code-reviewer.md
    - Captures avant/après landing page pour montrer l'harmonisation
```

### 3.2 — Validation manuelle après import

Avant de merger la PR d'import :

- [ ] `pnpm dev` charge sans erreur CSS
- [ ] `pnpm storybook` (si déjà installé) affiche les composants avec les
      bons tokens
- [ ] La landing page (`/landing/index.html`) a été re-harmonisée et la
      couleur indigo correspond exactement à la nouvelle accent
- [ ] Le logo SVG (`public/branding/logo-full.svg`) a son gradient mis à jour
- [ ] Light + dark mode tous les deux contrastent correctement (test
      manuel : toggle `prefers-color-scheme` dans Chrome DevTools)
- [ ] Aucun nouveau hex hardcodé n'a été introduit (`grep -rn "#[0-9a-fA-F]\{6\}" assets/ public/`)

---

## 4 · Pourquoi pas maintenant ?

Décision actée le 2026-06-21 : on garde le DS prêt à importer mais on ne
l'intègre pas tant qu'on n'attaque pas la première story UI (ST-18.1 Design
tokens, sprint 1-4 selon `tasks/_index.md`).

Raisons :

1. **Découplage** : tant qu'il n'y a pas de composants Vue à styler, les
   tokens en `assets/css/main.css` n'apportent rien d'opérationnel et
   risquent juste de partir en dérive avec les itérations dans Claude Design.
2. **Itération possible côté Claude Design** : on peut continuer à raffiner
   le DS (ajouter composants métier comme `CohorteHeatmap`, `HarnessReport`)
   sans avoir à pusher des updates dans le repo à chaque modif.
3. **Import propre** : quand on importe, on importe une version stabilisée
   et validée par toi, pas un brouillon.
4. **Diminution du bruit Git** : pas de gros commit "design system" dans un
   repo encore vide, et pas de divergence entre tokens et code qui les
   consomme.

---

## 5 · Comment continuer à itérer dans Claude Design avant l'import

Tu peux :

- Ouvrir le projet (`https://claude.ai/design/p/d8818aeb-82da-48d1-9273-ac7477ca79ad`)
- Demander à Claude Design des ajouts/modifications ("ajoute un composant
  CohorteHeatmap qui montre 10 stagiaires × 12 semaines avec des cellules
  colorées par statut")
- Tester les variants
- Ajuster la palette
- Quand tu es satisfait, mets à jour la **date de génération** dans la
  section 1 de ce document (`Généré le`) pour traçabilité

L'URL reste la même (le projet est versionné en interne dans Claude Design).

---

## 6 · Si l'URL change (cas de force majeure)

Si pour une raison quelconque l'URL Claude Design change (suppression,
nouveau projet, etc.) :

1. Régénérer un projet Claude Design en re-collant le prompt de
   `docs/product/14-claude-design-prompt.md`
2. Mettre à jour les valeurs `URL du projet` et `ID Claude Design` du
   tableau de la section 1 ici
3. Si l'import était déjà fait : ouvrir une PR
   `chore(design-system): update Claude Design source URL`

---

## 7 · Sécurité du lien

L'URL Claude Design est **liée à ton compte Anthropic**. Quelqu'un qui a
l'URL sans être loggué dans Claude ne peut rien faire de critique avec, mais
par hygiène :

- Ne **pas** la commiter en clair dans un fichier rendu public (la doc
  produit reste dans le repo privé pour le moment, OK)
- Si le repo devient open source, déplacer ces infos dans un fichier
  `docs/design/IMPORT.md` qui sera dans le `.gitignore`, ou dans un coffre
  1Password partagé entre formateurs

---

## 8 · Récap actionnable

| Quand                               | Action                                                           |
| ----------------------------------- | ---------------------------------------------------------------- |
| **Maintenant**                      | Rien à faire — info sauvegardée                                  |
| **Avant ST-18.1**                   | Vérifier le DS dans Claude Design, ajuster si besoin             |
| **Au démarrage de ST-18.1**         | `/design-login` puis demander à Claude Code l'import (cf. § 3.1) |
| **Si tu veux ajouter un composant** | Itérer dans Claude Design, mettre à jour ce doc                  |
