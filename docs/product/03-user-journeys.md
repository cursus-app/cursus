# 03 — Parcours utilisateurs (User Journeys)

Six parcours clés à concevoir et tester avec soin. Pour chacun : déclencheur, étapes, points de friction à éviter, signal de succès.

---

## Parcours 1 — Enrôlement d'un stagiaire (Formateur ⇒ Stagiaire)

### Déclencheur

Le formateur principal (Mohamed) doit ajouter un nouveau stagiaire (Karim) à une cohorte existante ou en cours de création.

### Étapes côté formateur

1. Mohamed se connecte → dashboard
2. **"Nouvelle cohorte"** OU sélection d'une cohorte existante
3. Si nouvelle cohorte : choisit un cursus (parmi la bibliothèque), définit les dates de début/fin, choisit le rythme (hebdo / bi-hebdo)
4. **"Inviter un stagiaire"** → saisit nom, prénom, email
5. Système envoie un email d'invitation contenant un lien magique (token signé, expire 7 jours)

### Étapes côté stagiaire

1. Karim reçoit l'email avec sujet : "Bienvenue dans le stage [Cursus X] — Crée ton compte"
2. Clique sur le lien → page de création de compte (mot de passe + acceptation CGU + photo de profil optionnelle)
3. Atterrit sur un **onboarding en 3 écrans** :
   - Écran 1 : "Voici ton parcours" (vue d'ensemble des semaines)
   - Écran 2 : "Voici comment ça marche" (livrable hebdo + validation auto + portfolio)
   - Écran 3 : "Connecte ton GitHub" (OAuth obligatoire — c'est la pièce centrale)
4. Atterrit sur la **semaine 1** prête à commencer

### Points de friction à éliminer

- ❌ Pas de demande de CB, pas de KYC, pas de formulaire long
- ❌ Pas d'inscription libre — uniquement par invitation
- ❌ Si Karim ne se connecte pas dans 7 jours, l'invitation expire et Mohamed reçoit une notif "rappel à envoyer"

### Signal de succès

Karim est connecté, son compte GitHub est lié, et il voit son parcours de la semaine 1 sans avoir contacté personne.

---

## Parcours 2 — Une semaine type pour le stagiaire

### Déclencheur

Lundi 8h, Karim ouvre Cursus.

### Étapes

1. **Vue "Cette semaine"** : "Semaine 3 sur 10 — Module Git avancé"
2. Section **Ressources** : 3-4 liens curatés (article freeCodeCamp, vidéo YouTube, doc officielle, MDN). Marquage "lu" optionnel mais visible (pas obligatoire).
3. Section **Pratique** : description du livrable hebdo
   > "Crée un repo public `git-advanced-karim` avec :
   >
   > - 3 branches : `main`, `feature/login`, `feature/footer`
   > - 1 PR de `feature/login` mergée en `squash` sur `main`
   > - 1 commit signé GPG
   > - Un fichier `RESUME.md` listant les commandes utilisées"
4. **Bouton "Soumettre mon livrable"** → champ URL du repo
5. Le harnais GitHub Actions se déclenche, retour en **2-5 minutes** :
   - ✅ Le repo existe et est public
   - ✅ Les 3 branches existent
   - ✅ La PR a été mergée en squash
   - ❌ Aucun commit signé GPG détecté
   - ✅ Le fichier RESUME.md existe
6. Karim voit le rapport, comprend qu'il faut configurer son GPG, refait, resoumet
7. Quand tout est vert : **+150 XP, badge "Git artisan" débloqué**, livrable ajouté au portfolio
8. **Quiz court de check-in** (5 questions, 5 minutes) : valide la compréhension conceptuelle des notions de la semaine. Score affiché à Karim uniquement.

### Points de friction à éliminer

- ❌ Le rapport du harnais doit être **lisible** (pas une stack trace brute) — un message clair par check
- ❌ La latence du harnais doit être **<5 min** sinon ça casse la boucle de feedback
- ❌ Pas de quota de soumissions illimité — pour éviter le brute force on autorise 10 soumissions max par livrable, puis on bloque jusqu'à intervention formateur

### Signal de succès

Karim termine sa semaine avec un livrable validé et son portfolio mis à jour, sans avoir contacté Mohamed.

---

## Parcours 3 — Blocage et alerte (Stagiaire ⇒ Formateur)

### Déclencheur

Karim est bloqué depuis 48h. **Deux chemins possibles** vers l'alerte :

**Chemin A — déclaratif (Karim demande de l'aide)**

1. Karim clique sur le bouton **"Je suis bloqué"** présent en permanence sur la page du livrable
2. Champ libre : "Décris ton blocage en 3 phrases. Plus tu es précis, plus la réponse sera rapide."
3. Mohamed reçoit une notif (in-app + email) avec le contexte complet (livrable, dernier rapport harnais, message de Karim)

**Chemin B — détection automatique**

1. Système détecte qu'on est à J+2 sans soumission de livrable, OU 2 quiz ratés consécutifs, OU 5+ soumissions échouées sur le même livrable
2. Le stagiaire passe en statut **"En alerte"** sur le dashboard formateur
3. Mohamed reçoit une notif quotidienne digest "2 stagiaires en alerte"

### Étapes côté formateur

1. Mohamed clique sur l'alerte → arrive sur la fiche stagiaire
2. Voit l'historique : ressources consultées, livrables soumis, rapports du harnais, message du stagiaire
3. Choix :
   - **Commenter** le livrable (texte + lien optionnel)
   - **Override le harnais** si le check est techniquement OK mais bloqué par un détail (rare)
   - **Planifier un appel** (intégration Calendar optionnelle, sinon lien externe)
   - **Étendre l'échéance** d'un livrable (le planning se décale)
4. Une fois résolu : marque l'alerte comme "Traitée"

### Points de friction à éliminer

- ❌ Pas de scoring de Karim pour avoir demandé de l'aide ("trop d'alertes" ≠ "mauvais stagiaire") — le système doit l'encourager à demander
- ❌ Le formateur doit avoir le contexte complet en 1 clic, pas avoir à fouiller

### Signal de succès

Le blocage est résolu en <24h ouvrées, Karim a repris sa progression, Mohamed n'a passé que 10-15 minutes sur le sujet.

---

## Parcours 4 — Capstone et soutenance

### Déclencheur

Karim atteint la dernière semaine de son cursus. Toutes les semaines précédentes sont validées.

### Étapes

1. **Semaine N-2** : Karim débloque l'épreuve capstone. Sujet généré à partir du cursus (par exemple : pour Sécurité Info L1, "Réalise un mini-audit de sécurité sur ce site cible — rapport, captures, recommandations").
2. Délai donné : **10-14 jours** pour le capstone.
3. Karim travaille sur son projet, peut soumettre des **versions intermédiaires** au harnais (qui fait des checks plus légers que sur les livrables hebdo : repo existe, README présent, structure attendue)
4. **Semaine N-1** : Karim soumet la version finale (URL repo + URL deploy + rapport PDF si pertinent)
5. Le harnais fait sa passe, puis le statut passe en **"En attente de soutenance"**
6. **Semaine N** : Mohamed et Karim conviennent d'un créneau (intégration Calendar ou lien externe)
7. Soutenance : visio (Zoom/Meet/etc., lien attaché au capstone) ou présentiel, **15-30 minutes** :
   - 5-10 min : Karim présente son projet (démo + choix techniques)
   - 5-15 min : questions du formateur
   - 5 min : feedback à chaud
8. Mohamed remplit une grille d'évaluation (5 critères × note /4) → score final
9. Si validé : **Capstone validé + portfolio rendu public + certificat émis (PDF auto-généré)**
10. Si non validé : Mohamed indique les axes à retravailler, planifie une 2e session (max 2 tentatives)

### Points de friction à éliminer

- ❌ Pas de calendrier intégré complexe au MVP — un simple champ "date prévue + lien visio" suffit
- ❌ La grille d'évaluation doit être pré-remplie pour chaque cursus (gabarit)

### Signal de succès

Karim sort de la soutenance avec un certificat, un portfolio public, et la capacité de présenter ses réalisations en entretien.

---

## Parcours 5 — Fin de stage et certification

### Déclencheur

Le capstone est validé.

### Étapes

1. Mohamed clique sur **"Émettre le certificat"** depuis la fiche du stagiaire
2. Le système génère un PDF avec :
   - Identité du stagiaire
   - Cursus suivi (titre, durée, dates)
   - Liste des modules validés
   - Lien public vers le portfolio
   - Note capstone (optionnel — anonymisé en "Validé avec mention" / "Validé" / "Validé sous conditions")
   - Signature numérique du formateur principal
   - QR code vers la page de **vérification publique** (anti-faux certificats)
3. Le PDF est attaché au profil du stagiaire (téléchargeable à vie)
4. Karim reçoit un email avec le PDF + un lien vers son **profil public** (qui devient un mini-CV technique)
5. Mohamed reçoit un récap "Cohorte X — résultats finaux" qu'il peut exporter (CSV)

### Points de friction à éliminer

- ❌ Le certificat doit être **vérifiable en ligne** par un tiers (recruteur) via le QR code
- ❌ Le profil public doit avoir un slug propre (`cursus.app/p/karim-d`), pas un UUID

### Signal de succès

Karim peut envoyer son lien de profil dans une candidature, le recruteur peut vérifier l'authenticité en 5 secondes.

---

## Parcours 6 — Création d'un cursus par un formateur

### Déclencheur

Mohamed veut créer un nouveau cursus (par exemple "Sécurité Info L1") qui n'existe pas encore.

### Étapes

1. Onglet **"Cursus"** → **"Nouveau cursus"**
2. Métadonnées : nom, domaine (parmi : Dev Web, Ingénierie Web, IA, Cybersec, autre), niveau (L1/L2/L3/M1/M2/Pro), durée prévue (2/3 mois), prérequis (texte libre)
3. **Option : importer depuis roadmap.sh** → sélection d'une roadmap source → l'app pré-remplit une liste de modules basée sur la structure de la roadmap (en respectant la licence — voir la story dédiée)
4. Pour chaque module :
   - Titre, objectifs pédagogiques
   - Semaine d'affectation
   - Ressources (URLs externes, avec titre + type : article, vidéo, doc, cours)
   - Livrable hebdo : description Markdown + critères de validation harnais (cases à cocher : repo existe, URL up, fichier X présent, tests passent, etc.)
   - Quiz : 5-10 questions, type QCM ou texte court (corrigées automatiquement si exact match, sinon revue formateur)
   - Badge associé (optionnel)
5. Description du **capstone** : sujet, durée, grille d'évaluation
6. **Prévisualisation** : Mohamed peut voir le cursus tel qu'un stagiaire le verrait
7. **Publier** → disponible pour assigner à une cohorte
8. Versionning : chaque modification d'un cursus crée une nouvelle version, les cohortes en cours restent sur leur version d'origine

### Points de friction à éliminer

- ❌ La saisie est longue — il faut un mode **brouillon** pour pouvoir revenir
- ❌ Possibilité de **cloner un cursus existant** pour ajuster (pas tout refaire)
- ❌ Import roadmap.sh doit être une vraie aide, pas un gadget — produire un squelette qui demande 50 % d'effort vs partir de zéro

### Signal de succès

Mohamed crée son cursus en 2-3 sessions de travail (≈ 4-6h cumulées), pas en 2 jours.

---

## Diagramme synthétique des parcours

```
┌─────────────────────────────────────────────────────────────────────┐
│                  CYCLE DE VIE D'UNE COHORTE                         │
└─────────────────────────────────────────────────────────────────────┘

  CRÉATION                EXÉCUTION                    CLÔTURE
  ════════                ═════════                    ═══════

  P6: Création   ──►   P1: Enrôlement   ──►   P2: Semaine type  ──┐
  cursus               stagiaires              (×N semaines)      │
                                                                   │
                       ┌──────────────────────────────────────────┘
                       │
                       ▼
                  ┌─────────────┐
                  │   Bloqué?   │ ──Oui──► P3: Blocage & alerte ──┐
                  └─────────────┘                                  │
                       │ Non                                       │
                       ▼                                           │
                  Semaine N-2 ◄──────────────────────────────────-─┘
                       │
                       ▼
                  P4: Capstone & soutenance
                       │
                       ▼
                  P5: Certification
                       │
                       ▼
                       FIN
```
