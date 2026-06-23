# Brief kick-off call — Cohorte pilote Cybersec L1

> Script minuté de la visio collective de **30 minutes** avec les 3-5 stagiaires pilotes, programmée **3 jours avant** le démarrage officiel de la semaine 1. Objectif : aligner le groupe, démontrer le produit, créer un lien minimal, lever les derniers doutes.

---

## Avant l'appel — préparation Mohamed (1h)

### Préparer les outils

- [ ] **Lien visio prêt** (Google Meet / Zoom / Jitsi — choix : Google Meet, déjà partagé dans l'invitation calendrier)
- [ ] **Présentation slides** : 10 slides max (voir section "Slides clés" plus bas) au format PDF ou Keynote
- [ ] **Démo prête** : compte Cursus "stagiaire-demo" pré-créé avec un livrable S1 simulé pour démonstration. Tester le parcours complet 1h avant.
- [ ] **Document à partager en chat** : lien vers l'onboarding (`03-onboarding-stagiaire.md`), lien vers la FAQ (`02-faq-stagiaires.md`), lien vers le cursus complet.
- [ ] **Formulaire de feedback hebdo** : URL Google Form prête, à partager en fin de call.

### Préparer le mindset

- [ ] Relire la liste des stagiaires (prénoms, parcours rapide, ce qui les motive — pour les nommer pendant l'appel)
- [ ] Préparer 1 anecdote personnelle ("ce qui m'a fait créer Cursus") pour humaniser le pitch
- [ ] Vérifier ton micro, ta caméra, ta lumière. **Tu vends une expérience premium** — la qualité de ton appel donne le ton.

### Préparer le suivi post-call

- [ ] Modèle d'email "Récap kick-off" prêt, à envoyer dans l'heure qui suit
- [ ] Calendrier des visios hebdo créé (lundi 18h × 8 semaines)

---

## Agenda minuté (30 min)

| Temps         | Bloc                                       | Format              |
| ------------- | ------------------------------------------ | ------------------- |
| 00:00 - 02:00 | Accueil + tour de table éclair             | Spontané            |
| 02:00 - 07:00 | Slide 1-3 — Pourquoi Cursus, pourquoi vous | Présentation        |
| 07:00 - 15:00 | Démo live de l'app (parcours complet S1)   | Démo                |
| 15:00 - 20:00 | Slide 4-6 — Engagement mutuel + règles     | Présentation courte |
| 20:00 - 28:00 | Q&A ouvert                                 | Échange             |
| 28:00 - 30:00 | Clôture + prochaines étapes                | Annonce             |

> Si Q&A déborde : prolonger jusqu'à 40 min max. Ne jamais couper une question sans réponse.

---

## Slides clés à préparer (10 slides)

### Slide 1 — Couverture

- Logo Cursus + tagline
- _"Cohorte pilote Cybersec L1 — Kick-off"_
- Date

### Slide 2 — Pourquoi Cursus existe

- 1 visuel : "Avant Cursus" (formateur débordé, stagiaire perdu, pas de portfolio à la fin)
- 1 visuel : "Avec Cursus" (cadence claire, validation auto, portfolio cumulatif)
- _Storytelling_ : "Quand j'encadrais mes premiers stagiaires, je passais 30 min par jour à demander 'où en es-tu ?'..."

### Slide 3 — Le deal avec vous

- "Vous êtes 5. Vous avez accepté. Voici ce qu'on construit ensemble."
- Tableau 2 colonnes : ce que tu reçois / ce que je te demande
- Date de fin : `[date capstone]`

### Slide 4 — Le cursus Cybersec L1 en une slide

- Frise des 8 semaines + capstone
- Titre par semaine (terminal, hygiène, OWASP×2, recon×2, crypto, défense, capstone)
- Charge horaire indicative

### Slide 5 — Comment ça marche concrètement

- Schéma : "Tu pousses un repo → Cursus regarde → te dit ce qui manque → tu corriges → validé → badge"
- Mentionner les 3 piliers : harnais auto, portfolio cumulatif, capstone soutenu

### Slide 6 — Ce qu'on attend de vous précisément

- 1 livrable / semaine
- 1 quiz check-in / semaine
- 1 formulaire de feedback 15 min / semaine ← _insister_
- Visio hebdo 30 min (facultative mais recommandée)
- Présence à la soutenance capstone

### Slide 7 — Vos garanties

- Suivi réactif (24h ouvrées)
- Astreinte légère sur les 8 semaines pour bugs bloquants
- Gratuité totale (et à vie sur les versions premium)
- Anonymisation de vos retours par défaut

### Slide 8 — Règles d'or

- Légalité : on n'attaque que des cibles autorisées (TryHackMe, labs locaux, scanme.nmap.org)
- Signature : tous les commits signés
- Pas de secrets dans le code
- Si tu doutes, tu demandes

### Slide 9 — Calendrier

- S1 démarre le `[date]`
- Visios hebdo : lundi 18h
- Capstone soutenance entre `[date1]` et `[date2]`
- Debrief individuel post-pilote : `[fenêtre]`

### Slide 10 — Q&A

- Plein écran : "Vos questions"
- Email de contact + WhatsApp (optionnel) en bas

---

## Démonstration live — séquence step-by-step (~8 min)

Tu fais ça **en partage d'écran** sur un compte Cursus dédié à la démo (handle `karim-demo`). Suis cette séquence :

### Étape 1 (1 min) — Page de connexion

- Montrer le login avec mot de passe + 2FA TOTP
- "Vous activerez le 2FA dès votre première connexion"

### Étape 2 (1 min) — Dashboard stagiaire

- Page d'accueil avec "Cette semaine" mis en avant
- Sidebar : Cette semaine / Ma progression / Mon portfolio / Profil

### Étape 3 (2 min) — Détail d'une semaine (prendre la S1)

- Objectifs pédagogiques
- Ressources (cliquer sur 1-2 liens pour montrer qu'ils s'ouvrent vraiment)
- Description du livrable (avec structure repo attendue)
- Critères harnais (en mode lisible : "le harnais vérifiera que…")

### Étape 4 (2 min) — Soumission d'un livrable

- Coller l'URL d'un repo "presque bon" (1 fichier manquant intentionnellement)
- Cliquer "Lancer la validation"
- Montrer le rapport en temps réel
- Montrer que le harnais dit précisément "le fichier `RESUME.md` est manquant"
- Re-pousser le fichier en live (alt+tab terminal, `git commit && git push`)
- Re-soumettre → cette fois ça passe
- Badge débloqué qui apparaît (animation)

### Étape 5 (1 min) — Page portfolio public

- Ouvrir l'URL publique `cursus.com/portfolio/karim-demo`
- Montrer qu'on voit les badges + les repos sans être loggé
- "C'est ça que vous donnerez aux recruteurs"

### Étape 6 (1 min) — Bouton "Je suis bloqué"

- Cliquer en live
- Montrer les catégories (consigne floue / harnais incompris / etc.)
- Envoyer un message de test
- "Je reçois la notif immédiatement, je vous réponds sous 24h max"

> ⚠️ **Avoir un plan B** : si la démo plante, basculer sur des screenshots préparés. Ne pas paniquer — tu peux même en rire ("vous voyez, on a _vraiment_ besoin de votre feedback de pilote").

---

## Questions pour briser la glace (à intercaler)

À utiliser au début du tour de table, pour mettre à l'aise. **Choisis-en 1**, pas plus :

- _"En 30 secondes : ton prénom, ton parcours actuel, et un truc en sécu qui t'a fait dire 'wow' récemment."_
- _"Présente-toi en 2 phrases, et dis-nous un outil tech que tu utilises tous les jours et que tu adores."_
- _"Vite : un mot pour décrire ce que la cybersécurité t'évoque AVANT ce cursus. On comparera avec après !"_

> 🎯 **Règle d'or** : tu parles **en dernier** au tour de table. Tu donnes l'exemple en restant court (30 sec max).

---

## Engagement mutuel — formuler clairement

À dire **mot-à-mot ou presque**, après la démo :

> "On a une espèce de contrat moral entre nous pour les 10 semaines qui viennent. Je vous dis ce que je m'engage à faire, et après je vous demande de me dire si vous êtes d'accord avec ce que je vous demande, vous.
>
> **De mon côté, je m'engage à** :
>
> - Vous répondre sous 24h ouvrées sur tous vos blocages
> - Tenir la visio hebdo de lundi 18h, sauf cas de force majeure
> - Garder le produit stable, en astreinte sur les bugs bloquants
> - Anonymiser vos retours par défaut, sauf demande explicite contraire
> - Vous fournir un cursus à valeur réelle pour votre carrière
>
> **De votre côté, je vous demande** :
>
> - 8 semaines + 2 semaines capstone, ~12h/semaine
> - 1 livrable + 1 quiz + 1 formulaire de feedback par semaine
> - De **me dire si vous avez un problème**, pas de disparaître silencieusement
> - D'**utiliser le bouton "Je suis bloqué"** dès que vous êtes vraiment coincés
> - De respecter scrupuleusement la légalité — on n'attaque que les cibles autorisées
>
> Quelqu'un a un point de désaccord ou veut négocier ? C'est le moment. Sinon, on considère que c'est notre deal."

---

## Q&A — préparer mentalement les questions probables

Ne pas être pris au dépourvu sur :

| Question probable                                          | Ta réponse en 2 phrases                                                                                                                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Combien d'heures vraiment ?"                              | "12h en moyenne, ça peut varier de 10 à 14 selon la semaine. Si vous en mettez beaucoup plus régulièrement, dites-le-moi — c'est un signal que je dois ajuster."        |
| "Et si j'ai un problème personnel qui me sort 1 semaine ?" | "Dis-le-moi, on décale ton rythme. Pas de pénalité. Le seul truc inacceptable c'est de disparaître sans signal."                                                        |
| "Le certificat sert vraiment à quelque chose ?"            | "À ce stade, c'est une preuve de réalisation crédible, pas un diplôme. Concrètement, c'est ton portfolio qui parle. Le certificat valide qu'on a vérifié le portfolio." |
| "Si je connais déjà tout sur une semaine, je fais quoi ?"  | "Tu fast-track : tu valides livrable + quiz, tu passes à la suivante. Ou tu approfondis avec les ressources bonus de la semaine."                                       |
| "Comment je sais si je suis dans les temps ?"              | "Page 'Ma progression' : tu vois la frise des 8 semaines, où tu en es, et un indicateur 'en avance / à l'heure / en retard'."                                           |
| "Si je veux quitter en cours, je préviens comment ?"       | "Un mail à moi, suffit. Pas besoin de te justifier. Je te demanderai juste 5 min pour comprendre pourquoi — utile pour le produit."                                     |
| "Mon GitHub doit vraiment être public ?"                   | "Oui pour le portfolio. Si ton entreprise interdit le code public, on peut configurer en privé avec invitation du bot — préviens-moi avant la S1."                      |
| "Quand je suis bloqué, je vous écris sur WhatsApp ?"       | "Non, le bouton 'Je suis bloqué' dans Cursus, pour qu'on garde tout au même endroit. Email si urgence vraie. WhatsApp : non, je veux protéger mes soirées."             |

---

## Clôture (2 min) — annoncer les prochaines étapes

> "On a 5 minutes pour boucler. Voilà ce qui se passe maintenant :
>
> **Dans l'heure** :
>
> - Je vous envoie un email récap avec le replay (si vous voulez), les liens vers la FAQ, l'onboarding, le formulaire feedback hebdo.
> - Je vous envoie l'invitation calendrier des 8 visios hebdo (lundi 18h).
>
> **D'ici à `[date démarrage]`** :
>
> - Vous complétez votre onboarding (5 min, checklist dans le doc envoyé)
> - Vous explorez la page 'Semaine 1' pour voir ce qui vous attend
> - Si vous avez besoin d'un échange 1-1 avec moi avant le démarrage : répondez à mon email, on cale 15 min.
>
> **Lundi `[date démarrage]` à 9h** :
>
> - La semaine 1 s'ouvre dans votre dashboard
> - Vous avez jusqu'au dimanche soir pour livrer (mais rien n'empêche de finir en 3 jours si vous en avez envie)
>
> Merci à tous d'être là. Honnêtement, je suis hyper content que ce soit vous 5. À lundi !"

---

## Après l'appel — Mohamed (1h max)

### Dans l'heure

- [ ] Envoyer l'email récap (modèle ci-dessous)
- [ ] Envoyer l'invitation calendrier des 8 visios hebdo
- [ ] Ajouter chaque stagiaire dans `_pilot-tracker.md` (état initial : "kicked-off")

### Dans la journée

- [ ] Noter à chaud : qui a parlé / qui s'est fait discret, qui semble surchargé / qui semble surmotivé
- [ ] Identifier les 1-2 stagiaires à suivre de plus près (ne le dire à personne)

### Modèle email récap (à envoyer dans l'heure)

```
Sujet : [Cursus] Récap kick-off + tout ce qu'il vous faut pour démarrer

Salut tout le monde,

Merci pour votre temps ce [jour] — c'était un vrai plaisir de mettre des têtes sur les noms.

Comme promis, voici tout ce dont vous avez besoin :

📅 CALENDRIER
- Démarrage S1 : lundi [date] à 9h (votre dashboard s'ouvre automatiquement)
- Visio hebdo : lundi 18h-18h30 (invitation calendrier reçue séparément)
- Soutenance capstone : entre [date1] et [date2] (créneaux à caler en S8)

📋 LIENS À GARDER SOUS LA MAIN
- Votre dashboard Cursus : https://cursus.com/login
- L'onboarding (à lire avant lundi) : [lien]
- La FAQ complète (20 questions/réponses) : [lien]
- Le programme Cybersec L1 complet : [lien]
- Le formulaire de feedback hebdo : [lien Google Form]
- Le bouton "Je suis bloqué" : déjà dans votre app

✅ AVANT LUNDI : 4 actions de 5 minutes chacune
1. Connectez-vous à Cursus et activez le 2FA TOTP
2. Vérifiez que votre GitHub est lié à votre compte
3. Configurez la signature GPG ou SSH de vos commits
4. Survolez la page "Semaine 1" pour voir ce qui vous attend

🆘 EN CAS DE QUESTION
- Sur Cursus : bouton "Je suis bloqué" (réponse 24h ouvrées max)
- Urgent / personnel : ce mail
- Pas de WhatsApp pour rester sain

Bon week-end, et à lundi !

Mohamed
```

---

## Annexe — checklist post-call (pour Mohamed)

À cocher avant fin de journée :

- [ ] Email récap envoyé
- [ ] Invitations calendrier hebdo envoyées
- [ ] Replay disponible (si enregistré, avec consentement)
- [ ] Notes à chaud écrites dans `_pilot-notes-mohamed.md`
- [ ] Astreinte légère configurée pour les 8 semaines (téléphone + Sentry alertes)
- [ ] Bots Slack/Discord configurés si retour stagiaire ailleurs que dans l'app

---

_Brief kick-off v1.0 — 2026-06-21. À utiliser tel quel pour le premier pilote, à enrichir avec retours pour cohorte 2._
