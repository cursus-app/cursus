# 13 — Ressources externes recommandées (libres de droits)

> Catalogue **curatif** des ressources externes que les cursus Cursus peuvent référencer. Inspiré du modèle "agréger + cadencer + valider" (cf. `01-vision.md` Pilier 1).

---

## 1. Critères de sélection

Avant d'ajouter une ressource dans un cursus, vérifier :

- [ ] **Libre de droit** (CC-BY, MIT, ou domaine public) — pas de contenu payant masqué
- [ ] **Maintenue** (dernière mise à jour < 18 mois) OU **canonique stable** (ex : MDN docs sur ES2015 — pas besoin de maj)
- [ ] **Cible le niveau du cursus** (pas de notion avancée non couverte en amont)
- [ ] **Compatible avec la stack moderne** (pas de ressource qui apprend une techno deprecated comme jQuery, sauf raison pédagogique)
- [ ] **Disponible offline** (idéal) ou stable en ligne
- [ ] **Aperçu OpenGraph correct** (titre + image) — pour rendu propre dans Cursus
- [ ] **Vérification trimestrielle** que l'URL répond toujours en 200 (job nocturne ST-03.3)

---

## 2. nodeschool.io — ateliers JS/Node auto-guidés

### Présentation

[NodeSchool](https://nodeschool.io/fr-fr/) propose des ateliers installables via npm. Chaque atelier est un CLI interactif qui valide la progression du stagiaire localement. C'est exactement l'esprit de Cursus : _faire, pas regarder_.

### Pourquoi c'est intéressant pour nous

1. **100% libre de droit** (licences MIT)
2. **Format installable + offline-first** — un stagiaire peut faire l'atelier sans connexion
3. **Auto-validateur local** — chaque atelier sait dire "tu as réussi" ou "il manque X"
4. **Disponible en français**
5. **S'intègre bien à notre harnais** : on peut vérifier dans un livrable hebdo que le stagiaire a complété un atelier nodeschool (ex : `learnyounode --completed > completion.txt`)

### Ateliers retenus (curation rigoureuse)

| Atelier                     | Cible cursus                | Module semaine           | Commande                                                                   |
| --------------------------- | --------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| **`javascripting`**         | Dev Web L1, IA L1           | Sem 1 — JS basics        | `npm i -g javascripting`                                                   |
| **`git-it`**                | **Tous cursus**             | Sem 1 — Git workflow     | App desktop ([release](https://github.com/jlord/git-it-electron/releases)) |
| **`learnyoubash`**          | Dev Web L1, Cybersec L1     | Sem 1 — Terminal Linux   | `npm i -g learnyoubash`                                                    |
| **`learnyouhtml`**          | Dev Web L1                  | Sem 2 — HTML sémantique  | `npm i -g learnyouhtml`                                                    |
| **`how-to-markdown`**       | **Tous cursus**             | Sem 0 — Documentation    | `npm i -g how-to-markdown`                                                 |
| **`learnyounode`**          | Dev Web L1 (Backend module) | Sem 5-6 — Node async I/O | `npm i -g learnyounode`                                                    |
| **`how-to-npm`**            | Dev Web L1 (Backend module) | Sem 6 — npm packaging    | `npm i -g how-to-npm`                                                      |
| **`promise-it-wont-hurt`**  | Dev Web L1, IA L1           | Sem 4 — Async/Await      | `npm i -g promise-it-wont-hurt`                                            |
| **`regex-adventure`**       | Cybersec L1                 | Sem 3 — Pattern matching | `npm i -g regex-adventure`                                                 |
| **`scope-chains-closures`** | Dev Web L2                  | Sem 2 — JS avancé        | `npm i @workshoppers/scope-chains-closures -g`                             |

### Ateliers à NE PAS référencer (deprecated, obsolètes, ou cible non pertinente)

- `expressworks` (Express style 2014, on enseigne Nitro/Nuxt moderne)
- `makemehapi` (Hapi peu utilisé en 2026)
- `learnyoumongo` (MongoDB pas dans notre stack, on est Postgres + Prisma)
- `learnyoureact` (React 2016, on enseigne Vue 3.5 si front)
- `LololoDash` (Lodash en grande partie remplacé par ES2020+)
- `bacon-love` (Bacon.js obsolète, RxJS moderne préféré)
- `browserify-adventure` (Vite/esbuild ont gagné)
- `LESS is more` (Tailwind 4 a tué LESS pour notre usage)
- `learn-sass` (idem)
- `webgl-workshop`, `Shader School`, `Intro to WebGL` (niche graphique, hors cursus)
- `goingnative`, `learnuv`, `Post-mortem debugging` (trop avancé pour L1, niche pour L2+)

### Pattern d'intégration dans un module Cursus

Quand un module recommande un atelier nodeschool, le livrable hebdo demande au stagiaire de **prouver la complétion**. Exemple :

```markdown
## Livrable Semaine 1 — Git workshop

Complète l'atelier `git-it` ([github](https://github.com/jlord/git-it-electron)).

**Livrable** :

1. Lien vers ton repo GitHub `<handle>/git-it-completion` (public)
2. Capture d'écran de la fin du workshop (challenges 12/12)
3. Fichier `RESUME.md` listant ce que tu as appris (5 phrases minimum)

**Critères harnais** :

- ✅ `repo_exists_public` (nom : `git-it-completion`)
- ✅ `file_exists` (RESUME.md avec longueur min)
- ✅ `file_exists` (capture en .png dans le repo)
```

---

## 3. Autres ressources libres recommandées (par domaine)

### 3.1 Fondamentaux universels

| Ressource                                           | Type                   | Licence       | Usage                                                         |
| --------------------------------------------------- | ---------------------- | ------------- | ------------------------------------------------------------- |
| [MDN Web Docs](https://developer.mozilla.org/fr/)   | Documentation          | CC BY-SA 2.5+ | Référence canonique HTML/CSS/JS — citer extensivement         |
| [The Odin Project](https://www.theodinproject.com/) | Cursus complet         | Open source   | Bon parcours alternatif Dev Web pour autodidactes             |
| [freeCodeCamp](https://www.freecodecamp.org/)       | Plateforme certifiante | Gratuit       | Référencer ses certifications JS Algorithms et Responsive Web |
| [roadmap.sh](https://roadmap.sh)                    | Roadmaps visuelles     | CC BY-SA 4.0  | **Source de structure** pour nos cursus (cf. ST-03.7)         |

### 3.2 Git & GitHub

| Ressource                                                             | Type                   | Note                                              |
| --------------------------------------------------------------------- | ---------------------- | ------------------------------------------------- |
| [git-it](https://github.com/jlord/git-it-electron)                    | Atelier (nodeschool)   | Top choix pour S1                                 |
| [Pro Git book (Chacon & Straub)](https://git-scm.com/book/fr/v2)      | Livre référence        | CC BY-NC-SA 3.0 — chapitres 1-3 suffisent pour L1 |
| [Learn Git Branching](https://learngitbranching.js.org/?locale=fr_FR) | Tuto visuel interactif | Pour comprendre rebase/merge visuellement         |

### 3.3 HTML / CSS / Sémantique

| Ressource                                                  | Type                | Note                                     |
| ---------------------------------------------------------- | ------------------- | ---------------------------------------- |
| [MDN HTML](https://developer.mozilla.org/fr/docs/Web/HTML) | Documentation       | Référence                                |
| [web.dev (Google)](https://web.dev/learn/html/)            | Cursus structuré    | "Learn HTML" parfait pour L1             |
| [HTML5 Doctor](http://html5doctor.com/)                    | Articles sémantique | Pour les questions de sémantique avancée |

### 3.4 Tailwind CSS / Frontend

| Ressource                                                    | Type                     | Note                                                                                                                  |
| ------------------------------------------------------------ | ------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [Tailwind v4 docs](https://tailwindcss.com/docs)             | Documentation officielle | Référence à jour                                                                                                      |
| [Vue.js Guide](https://fr.vuejs.org/guide/introduction.html) | Documentation officielle | Pour cursus Dev Web qui touchent Vue (rare en pratique côté cursus, mais utile pour ceux qui veulent aller plus loin) |

### 3.5 Backend / Node

| Ressource                                                   | Type                   | Note                                                         |
| ----------------------------------------------------------- | ---------------------- | ------------------------------------------------------------ |
| [learnyounode](https://github.com/workshopper/learnyounode) | Atelier nodeschool     | Excellent pour async I/O                                     |
| [Node.js docs](https://nodejs.org/fr/docs/)                 | Référence              | À utiliser parcimonieusement (très dense)                    |
| [Honojs docs](https://hono.dev/)                            | Si on enseigne du Hono | (Pas dans nos cursus core, mais peut être présenté en bonus) |

### 3.6 Base de données

| Ressource                                                  | Type                     | Note                                              |
| ---------------------------------------------------------- | ------------------------ | ------------------------------------------------- |
| [SQLBolt](https://sqlbolt.com/)                            | Tutoriel SQL interactif  | Excellent pour L1                                 |
| [PostgreSQL Tutorial](https://www.postgresqltutorial.com/) | Documentation            | Pour ceux qui touchent Postgres directement       |
| [Prisma docs](https://www.prisma.io/docs/)                 | Documentation officielle | Pour ceux qui utilisent Prisma dans leur capstone |

### 3.7 Cybersécurité

| Ressource                                                                | Type              | Note                                        |
| ------------------------------------------------------------------------ | ----------------- | ------------------------------------------- |
| [OWASP Top 10](https://owasp.org/www-project-top-ten/)                   | Référence         | Canonique                                   |
| [PortSwigger Web Security Academy](https://portswigger.net/web-security) | Cursus interactif | Gratuit, excellent pour L2+                 |
| [TryHackMe](https://tryhackme.com/) (modules gratuits)                   | Lab interactif    | Sélectionner uniquement les rooms gratuites |
| [HackTricks](https://book.hacktricks.xyz/)                               | Wiki techniques   | Référence avancée — L2+                     |

### 3.8 IA / ML

| Ressource                                                                           | Type             | Note                                         |
| ----------------------------------------------------------------------------------- | ---------------- | -------------------------------------------- |
| [3Blue1Brown — Neural Networks](https://www.3blue1brown.com/topics/neural-networks) | Vidéos           | Compréhension visuelle imbattable            |
| [Fast.ai](https://www.fast.ai/)                                                     | Cours en ligne   | Pour ceux qui veulent toucher du ML appliqué |
| [Hugging Face Course](https://huggingface.co/learn)                                 | Cours interactif | Pour NLP/Transformers                        |

---

## 4. Ressources qu'on ne référence PAS (et pourquoi)

| Ressource                              | Raison du rejet                                               |
| -------------------------------------- | ------------------------------------------------------------- |
| Udemy gratuit                          | Pas vraiment libre — souvent payant déguisé, qualité variable |
| Coursera gratuit en audit              | UX dégradée intentionnellement pour pousser au paiement       |
| YouTube tutos longs (>30 min)          | Format non-pratique, pas validable, qualité hétérogène        |
| Articles "Top 10 X" sur Medium         | Souvent du SEO bait sans profondeur                           |
| Code along sur YouTube Vue/React 2018+ | Versions trop anciennes des frameworks                        |
| Stack Overflow comme cours             | C'est une référence ponctuelle, pas un cours                  |

---

## 5. Processus d'ajout d'une nouvelle ressource

Quand un formateur veut ajouter une ressource dans un cursus :

1. **Vérifier la licence** (CC, MIT, ou domaine public obligatoire)
2. **Vérifier la maintenance** (ou statut canonique)
3. **Tester soi-même** la ressource avant de la recommander
4. **Estimer la durée réaliste** (souvent à doubler du temps annoncé)
5. **Vérifier l'URL** répond bien en 200 (job auto ST-03.3)
6. **Ajouter via le UI Cursus Builder** (ST-03.3)
7. **Optionnel : ajouter à ce document** si la ressource est suffisamment "centrale" pour mériter d'être référencée comme catalogue

---

## 6. Vérification trimestrielle des liens

Job nocturne déjà prévu (ST-03.3 — `check-broken-links` Inngest cron). Tous les liens cassés génèrent une alerte au formateur owner du module.

Pour les ressources de ce catalogue : vérification manuelle trimestrielle par Mohamed (ou un script ad-hoc qui re-vérifie au démarrage de chaque cohorte).
