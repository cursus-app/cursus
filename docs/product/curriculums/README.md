# curriculums/ — Cursus complets prêts à l'emploi

> Chaque fichier ici est un **cursus complet** : structure semaine par semaine, ressources externes libres, livrables avec critères harnais YAML, quiz, badges, capstone. Ces fichiers sont conçus pour que tu puisses **les copier directement dans le Cursus Builder** de l'app Cursus (EP-03) au moment de créer une cohorte.

---

## Cursus disponibles

| Fichier                              | Niveau      | Durée            | Domaine               | Stagiaires cible                           |
| ------------------------------------ | ----------- | ---------------- | --------------------- | ------------------------------------------ |
| [`cybersec-l1.md`](./cybersec-l1.md) | L1 (junior) | 8 sem + capstone | Sécurité informatique | Première année info, 0 expérience cybersec |

À venir (v1.x) :

- `dev-web-l1.md` (front + back basics)
- `ia-l1.md` (Python + ML fondamentaux)
- `devops-l1.md` (Linux + Docker + CI/CD)
- `dev-web-l2.md` (full-stack avancé)

---

## Format d'un cursus

Tout fichier de cursus suit la même structure (cf. `cybersec-l1.md` qui sert de référence canonique) :

1. **Métadonnées** : durée, niveau, prérequis, charge horaire, stack ressources, validation
2. **Objectifs pédagogiques** : 5-6 compétences mesurables en sortie
3. **Semaine 1 à N** : pour chaque semaine
   - Objectifs (3)
   - Ressources libres (3-5 avec lien + durée + justification)
   - Livrable (structure repo + README + captures)
   - Critères harnais YAML (prêts à coller dans le Cursus Builder)
   - Quiz check-in (5 questions QCM/court avec corrigés)
   - Badge associé
   - Temps estimé
4. **Capstone** : sujet 1 page + délai + livrable + critères harnais + grille soutenance + mention

---

## Ajouter un nouveau cursus

1. **Copier `cybersec-l1.md`** comme template
2. **Adapter les métadonnées** (niveau, domaine, prérequis)
3. **Définir les 8-10 semaines** (objectifs, ressources libres uniquement — cf. `../13-ressources-externes.md` pour les sources approuvées)
4. **Pour chaque livrable, définir des critères harnais concrets et auto-vérifiables** (utiliser la bibliothèque de checks de EP-06)
5. **Test pédagogique** : faire passer le cursus à 1-2 personnes en interne avant de l'ouvrir à une cohorte officielle
6. **Importer dans l'app** via le Cursus Builder une fois Cursus déployé

---

## Règles non négociables

- ❌ Pas de ressource payante masquée (Udemy, Coursera audit dégradé, etc.)
- ❌ Pas de scénarios sur cibles non-autorisées (pour cybersec : toujours TryHackMe rooms désignées, HackTheBox starting point, ou cibles dédiées au stagiaire)
- ❌ Pas de techniques offensives sans cadrage éthique explicite
- ✅ Chaque livrable doit pouvoir être vérifié **automatiquement** par le harnais (pas de "à valider à l'oral" sauf pour le capstone)
- ✅ Chaque ressource doit avoir un lien stable (vérification trimestrielle, cf. ST-03.3)
- ✅ Mention explicite des licences quand il y a un doute (CC, MIT, etc.)
