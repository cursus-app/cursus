# Maquettes — export Claude Design

## `cursus-design-system.dc.html`

Canvas **source** du design system Cursus, exporté tel quel depuis Claude Design
(projet « Design system Cursus »). C'est la maquette-clé : une page unique qui
présente **fondations + atomes** :

- Palette OKLCH (indigo + neutrals + sémantiques) light & dark
- Typographie (échelle Major Third, Inter + JetBrains Mono)
- Espacement / rayons / ombres / motion
- Système d'icônes (Tabler, outline)
- Atomes : Button, Input/Textarea, Checkbox/Radio/Switch, Badge/Tag/Avatar/Kbd/Tooltip/Skeleton
- Micro-interaction signature (validation XP)

### Rendu

Ce fichier est au **format Claude Design** (`<x-dc>` + bindings `DCLogic`,
`<script src="./support.js">`). Il se **ré-ouvre dans Claude Design** (le runtime
`support.js` est fourni par la plateforme) — il n'est donc pas rendu tel quel
hors de Claude Design.

➡️ Pour des références **rendables hors-ligne**, voir
`../components/*.html` (atomes extraits en HTML/CSS statique autonome) et les
captures `../screenshots/`.

### Re-synchroniser

Source : <https://claude.ai/design/p/d8818aeb-82da-48d1-9273-ac7477ca79ad>
(fichier `Cursus Design System.dc.html`). Réimport via le MCP `claude_design`
(`/design-login` puis `DesignSync get_file`).
