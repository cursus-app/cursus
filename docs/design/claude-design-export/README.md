# Claude Design — Export

> Ce dossier reçoit l'export du design system généré par **Claude Design**
> (claude.ai/design). Voir la procédure complète dans
> [`docs/product/14-claude-design-prompt.md`](../../product/14-claude-design-prompt.md).

## Structure attendue après import

```
claude-design-export/
├── README.md              ← ce fichier
├── tokens.md              ← export texte des tokens (référence)
├── palette-light.png      ← capture palette mode clair
├── palette-dark.png       ← capture palette mode sombre
├── components-overview.png ← capture matrice complète des composants
├── components/            ← maquettes par composant (atomes/molécules/organismes)
│   ├── button.png
│   ├── input.png
│   ├── card.png
│   └── ...
└── mockups/               ← écrans-clés représentatifs
    ├── dashboard-formateur.png
    ├── parcours-stagiaire.png
    ├── verification-certificat.png
    └── modal-soumission.png
```

## Hiérarchie de vérité

1. **Tokens dans `assets/css/main.css`** (consommés au runtime — autoritaires)
2. **Captures dans ce dossier** (référence visuelle pour les reviews)
3. **`docs/product/10-design-system.md`** (principes)

En cas de conflit entre code et captures → captures gagnent → ouvrir une issue
de drift et corriger les tokens.
