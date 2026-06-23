# Claude Design — Export

> Export du design system **Cursus** depuis **Claude Design** (claude.ai/design).
> Procédure de prompt d'origine : [`docs/product/14-claude-design-prompt.md`](../../product/14-claude-design-prompt.md).
> Procédure d'import : [`docs/product/15-design-system-import.md`](../../product/15-design-system-import.md).

## Source & version

|                          |                                                                   |
| ------------------------ | ----------------------------------------------------------------- |
| **Projet Claude Design** | « Design system Cursus »                                          |
| **URL**                  | <https://claude.ai/design/p/d8818aeb-82da-48d1-9273-ac7477ca79ad> |
| **Fichier source**       | `Cursus Design System.dc.html`                                    |
| **Version**              | v0.1 — MVP (fondations + atomes)                                  |
| **Importé le**           | 2026-06-23                                                        |
| **Importé via**          | MCP `claude_design` (`DesignSync get_file`)                       |

## Contenu de l'export

```
claude-design-export/
├── README.md                      ← ce fichier (source, date, version)
├── tokens.md                      ← référence textuelle des tokens (OKLCH)
├── components/                    ← atomes en HTML/CSS statique autonome (rendables hors-ligne)
│   ├── _tokens.css                ← tokens autonomes (miroir de main.css) pour ces fichiers
│   ├── button.html
│   ├── input.html
│   ├── controls.html              ← checkbox / radio / switch
│   ├── badge.html                 ← badge / tag / avatar / kbd / tooltip / skeleton
│   └── signature.html             ← micro-interaction validation XP
├── mockups/
│   ├── README.md
│   └── cursus-design-system.dc.html   ← canvas source Claude Design (maquette-clé)
└── screenshots/
    ├── landing-before.png         ← landing AVANT harmonisation
    └── landing-after.png          ← landing APRÈS harmonisation tokens DS
```

## Hiérarchie de vérité

1. **`assets/css/main.css`** — tokens consommés au runtime. **Autoritaire.**
2. **`tokens.md` + `components/*.html`** — référence lisible/visuelle pour les revues.
3. **`mockups/cursus-design-system.dc.html`** — canvas source (ré-ouvrable dans Claude Design).
4. **`docs/product/10-design-system.md`** — principes produit.

En cas de conflit entre le code et l'export → l'export gagne → ouvrir une issue
de _drift_ et corriger les tokens dans `main.css`.

## Ré-synchroniser après une mise à jour Claude Design

```
/design-login                       # autoriser l'accès design-system
# puis, via le MCP claude_design (outil DesignSync) :
#   get_project / list_files / get_file  sur le projet ci-dessus
```

Mettre ensuite à jour `assets/css/main.css`, `tokens.md` et ré-extraire les
`components/*.html` impactés. Bumper la version ci-dessus.
