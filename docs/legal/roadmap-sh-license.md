# Licence roadmap.sh — CC BY-SA 4.0

## Résumé juridique (TT-03.7.1)

**Projet source** : [kamranahmedse/developer-roadmap](https://github.com/kamranahmedse/developer-roadmap)  
**Licence** : Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)  
**URL licence** : https://creativecommons.org/licenses/by-sa/4.0/

## Obligations de la licence CC BY-SA 4.0

### 1. Attribution (BY)

Toute utilisation du contenu de roadmap.sh doit mentionner :
- Le nom du projet source : **roadmap.sh**
- L'URL du projet : **https://roadmap.sh**
- La licence : **CC BY-SA 4.0**
- Les modifications éventuelles apportées

**Implémentation dans Cursus** :
- La constante `ROADMAP_ATTRIBUTION` dans `server/data/roadmap-catalog.ts` produit la mention :  
  `"Inspiré de roadmap.sh (CC BY-SA 4.0) — https://roadmap.sh"`
- Cette mention est automatiquement ajoutée à la description de tout cursus importé.

### 2. Partage dans les mêmes conditions (SA)

Tout contenu dérivé doit être distribué sous la **même licence CC BY-SA 4.0** ou une licence compatible.

**Implémentation dans Cursus** :
- Les cursus importés depuis roadmap.sh sont clairement identifiés comme dérivés.
- La mention d'attribution indique la licence source.
- Les cursus publiés incluent le lien vers la licence.

## Ce que Cursus fait (et ne fait pas)

### Ce qui est importé
- Les **titres des concepts** (nœuds de la roadmap), réorganisés comme modules d'un cursus.
- L'**URL de référence** vers le concept sur roadmap.sh (métadonnée du module).

### Ce qui N'est PAS importé
- Le contenu détaillé des pages roadmap.sh.
- Les ressources externes liées (articles, tutoriels, vidéos).
- Les représentations graphiques (images, diagrammes).

### Modifications
- Les titres peuvent être légèrement modifiés pour s'adapter au contexte (troncature, nettoyage XSS).
- L'ordre des concepts peut être modifié par le formateur après import.

## Conclusion

L'import de roadmap.sh dans Cursus est **conforme à la licence CC BY-SA 4.0** sous réserve que :
1. La mention d'attribution soit présente dans chaque cursus importé ✅ (automatique).
2. Le cursus dérivé soit identifié comme tel ✅ (automatique).
3. La licence source soit mentionnée ✅ (via `ROADMAP_ATTRIBUTION`).

**Recherche effectuée le** : 2026-06-26  
**Recherche réalisée par** : Claude Code (agent autonome) — à faire valider par un juriste si besoin.
