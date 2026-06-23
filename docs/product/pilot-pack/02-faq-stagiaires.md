# FAQ Stagiaires — Pilote Cursus Cybersec L1

> 20 questions/réponses anticipant les questions des 3-5 stagiaires pilotes. À envoyer en pièce jointe (ou lien) de l'email d'invitation. Mise à jour à chaque nouvelle question fréquemment posée.

---

## Pratique

### 1. Combien d'heures par semaine je dois prévoir ?

Environ **12 heures par semaine** en moyenne. Concrètement : ~8h de ressources (lectures, vidéos, labs interactifs) + ~4h pour produire le livrable. Certaines semaines sont plus légères (S5 ~10h), d'autres plus chargées (S6 ~13h). Le détail est dans le programme du cursus, semaine par semaine.

Si tu sens que tu en mets beaucoup plus régulièrement, **dis-le moi** — soit le cursus est mal calibré (j'ai besoin de le savoir), soit on identifie où tu te perds et on te débloque.

### 2. Combien de temps dure le pilote ?

**8 semaines de cursus** + **2 semaines de capstone** (audit complet + rapport + soutenance) = **10 semaines au total**, soit ~2 mois et demi.

Dates exactes : du **[date début]** au **[date fin]**. Soutenance capstone entre le **[date fin]** et le **[date fin + 4]**.

### 3. Où ça se passe ? Je dois me déplacer ?

**100% distanciel**. Tu travailles depuis chez toi, depuis ton lieu de stage, depuis une bibliothèque — peu importe. La seule contrainte technique : avoir une connexion internet stable et un laptop (cf. question 5).

Une **visio collective de 30 min par semaine** (lundi 18h par défaut, négociable au kick-off) — pas obligatoire mais fortement recommandée. C'est l'occasion de poser des questions, voir où en sont les autres et créer un peu de lien.

### 4. C'est en français ou en anglais ?

**Le cursus, les consignes et le suivi sont en français.** En revanche, plusieurs ressources sont uniquement en anglais (PortSwigger Academy, OWASP, HackTricks). Niveau requis : **anglais technique lecture**. Si tu lis un article Stack Overflow sans souffrir, tu es bon.

Le rapport capstone peut être rendu en français ou en anglais (au choix). Idem pour la soutenance.

---

## Technique

### 5. Mon laptop suffit ? J'ai un MacBook Air M1 / un PC sous Windows / un Linux...

**Configuration minimale recommandée** : 8 Go RAM, 50 Go d'espace disque libre, processeur récent (≥2020).

- **MacBook (Intel ou Apple Silicon)** : parfait, tu auras tous les outils CLI nativement (ou via Homebrew).
- **Windows** : tu installeras **WSL2 (Ubuntu)** dès la semaine 1. C'est une étape déjà documentée dans le cursus, on t'accompagne. Ça remplace une VM lourde et c'est devenu le standard.
- **Linux** (Ubuntu, Fedora, Debian) : nickel, c'est notre environnement de référence.

Pour les labs des semaines 3-4 (OWASP Juice Shop, DVWA), on utilise **Docker Desktop** (gratuit pour usage perso et éducatif). Il faut donc 8 Go de RAM minimum pour que ça tourne confortablement.

### 6. Je n'ai pas de compte GitHub. C'est grave ?

Pas du tout, **tu en crées un en 3 minutes** (gratuit, durée de vie illimitée). On te guide étape par étape dans la première semaine. C'est un prérequis obligatoire car Cursus repose sur "pousser un repo = être noté" (modèle GitHub Classroom).

Conseil : choisis un **handle professionnel** (pas `xX_d4rkzelda_2003_Xx`) — ce profil va devenir ton portfolio public, un futur recruteur le regardera.

### 7. Je n'ai jamais utilisé un terminal. Je vais ramer ?

**La semaine 1 est entièrement dédiée au terminal et à Git.** L'atelier `learnyoubash` (recommandé) part vraiment de zéro : `cd`, `ls`, `pipe`, etc. Si à la fin de la semaine 1 tu te sens largué, on en discute en visio — c'est ok de prendre 1 semaine supplémentaire pour consolider.

Petit secret : 90 % des stagiaires "se débloquent" sur le terminal en 3-4 jours. Le déclic se fait toujours.

### 8. Je dois acheter quelque chose ? Des licences ?

**Non.** Le cursus est 100% basé sur des outils gratuits et open source :

- Compte GitHub (gratuit)
- TryHackMe (compte free, on n'utilise que les rooms gratuites)
- PortSwigger Academy (gratuit, juste un email pour l'accès)
- OWASP Juice Shop (open source, à installer en local via Docker)
- nmap, Burp Suite Community Edition, openssl, age — tous gratuits

**Total coût pour toi : 0 €**. Si une ressource payante apparaît, je te dirai explicitement "tu peux ignorer" et te proposerai une alternative gratuite.

### 9. Mon GitHub doit-il être public ?

**Oui, les repos liés à Cursus doivent être publics** — c'est le cœur de la philosophie "portfolio cumulatif". À la fin du cursus, ces repos forment ta carte de visite.

**Exception possible** : si tu travailles dans une entreprise qui interdit le code public, on peut configurer des repos privés et inviter le bot Cursus en tant que collaborateur. Dis-le-moi avant le kick-off.

**Attention** : ne pousse **jamais** de secrets (mots de passe, clés API, fichiers `.env`) dans tes repos. Le harnais détecte les leaks et te bloque le livrable. Si ça arrive : utilise `git filter-branch` ou demande-moi de l'aide.

---

## Pédagogique

### 10. Je n'ai aucune base en cybersécurité. C'est vraiment pour moi ?

**Oui, le cursus est conçu pour ça.** Le L1 = "Level 1" = découverte. Si tu sais ce que c'est qu'un mot de passe et que tu es curieux, tu as le niveau.

Ce qu'on présuppose :

- Tu sais ouvrir un terminal et taper des commandes (même basiques)
- Tu sais ce que c'est qu'un site web, une URL, HTML/CSS de base
- Tu sais ce que c'est que Git (concept au moins)

Si l'un de ces points te manque, dis-le-moi — on adapte. Mais sache que beaucoup de "pros" de la cybersec ont commencé avec moins.

### 11. Et si je suis déjà à l'aise sur certains modules ?

Tu peux **fast-track** : valider le livrable et le quiz, puis passer à la suite. Le harnais te valide indépendamment de ta vitesse. Si tu finis la semaine en 3 jours, tu peux soit attaquer la suivante en avance, soit approfondir avec les ressources "bonus" indiquées dans chaque semaine.

Inverse : si une semaine te prend 15j au lieu de 7, c'est ok — on décale ton rythme. L'objectif est que **tu maîtrises**, pas que tu coures.

### 12. Comment je suis accompagné si je suis bloqué ?

Trois canaux :

1. **Bouton "Je suis bloqué"** dans l'app Cursus → je reçois une notif et je te réponds sous **24h ouvrées maximum** (généralement <4h).
2. **Visio collective hebdo** (30 min lundi 18h) : tu poses tes questions devant les autres pilotes, on débloque ensemble.
3. **Email direct** : `mohamed@[domaine].com` si tu préfères en privé.

Le rapport du harnais est aussi pensé pour être **lisible** : il te dit précisément ce qui manque ("Le fichier `RESUME.md` doit faire au moins 10 lignes, il en fait 7"). Lis-le en premier avant de demander.

### 13. Vais-je avoir des cours en visio en plus des ressources ?

**Non**, le format est **asynchrone**. Tu apprends sur les ressources sélectionnées (articles, vidéos, ateliers interactifs), à ton rythme. La visio hebdo de 30 min est dédiée aux questions/réponses, **pas** à un cours magistral.

C'est volontaire : on veut que tu apprennes à **apprendre seul** et à **chercher l'info** — c'est ce qui te servira en vrai dans ta carrière.

### 14. Et si j'échoue un livrable ?

Pas de drame. Tu as **3 tentatives** par livrable hebdo. Le rapport du harnais te dit quoi corriger. Si tu échoues 3 fois, on regarde ensemble — soit la consigne est mal formulée (je corrige), soit on te débloque manuellement (override formateur).

**Important** : tu ne "rates" pas un cursus parce que tu rates un livrable. Tu rates seulement si tu ne livres rien du tout pendant plusieurs semaines sans communiquer. La triche au capstone, en revanche, c'est l'élimination directe.

---

## Pilote

### 15. Qu'est-ce que ça veut dire "stagiaire pilote" exactement ?

Ça veut dire que :

1. **Tu es parmi les tout premiers** à utiliser le produit Cursus — entre 3 et 5 personnes au total.
2. **Tu vas trouver des bugs** ou des trucs UX confus. C'est attendu. Quand ça arrive, signale-les (un email, un screenshot) — chaque retour est précieux.
3. **Tes retours influent directement** sur la v1.0 publique. Tu vas voir tes suggestions implémentées sur le produit.
4. **C'est gratuit** pour toi (et le restera à vie sur les versions premium).

Côté risques :

- Le produit peut planter (j'ai prévu une astreinte sur les 8 semaines)
- Une fonctionnalité peut changer en cours de route si on découvre qu'elle ne marche pas
- Le harnais peut occasionnellement mal valider (false positive ou false negative) — je débloque manuellement quand ça arrive

### 16. Mes retours seront utilisés comment ? Anonymement ?

**Par défaut, tes retours sont anonymisés** dans toute communication externe (témoignage, étude de cas, article). Si je veux te citer nominativement, je te demande à chaque fois.

Concrètement, je collecte :

- Tes réponses au formulaire hebdo (4 questions, 15 min)
- Tes messages de blocage (utilité, friction)
- Tes temps de complétion (déjà visibles dans l'app)
- Un entretien individuel de 45 min en fin de pilote (enregistré uniquement avec ton accord)

Tu peux à tout moment me demander la suppression de tes données.

### 17. Si j'abandonne en cours de route, c'est grave ?

**Honnêtement, ça m'embête** — mais je préfère que tu me le dises tôt plutôt que de te voir disparaître silencieusement. Si tu abandonnes :

- Tu gardes l'accès à ton portfolio et aux ressources
- Tu peux reprendre plus tard (sur la cohorte suivante si tu veux)
- Tu n'as **aucune pénalité** (ce n'est pas un contrat formel)

En revanche : **dis-le-moi**. Un simple message "Mohamed, j'arrête, ce n'est pas pour moi" me suffit. Pas besoin de te justifier. Je te demanderai juste 5 minutes pour comprendre pourquoi (utile pour améliorer le produit).

### 18. Je peux inviter un ami qui est intéressé ?

**Pas pour ce pilote** — on est volontairement à 5 max pour pouvoir bien suivre chacun. Mais note son nom : la **2ème cohorte démarre en [Q4 2026]** et tu pourras le parrainer.

---

## Suite après le pilote

### 19. Qu'est-ce que je reçois à la fin si je vais au bout ?

À la **fin du capstone validé** (note ≥13/20) :

1. **Certificat numérique Cursus** : un PDF signé cryptographiquement + une URL publique de vérification. Au standard **Open Badges 3.0**, donc importable sur LinkedIn (bouton "Add to Profile"), Mozilla Backpack, Credly.
2. **Portfolio public** : la collection complète de tes 10 repos (8 hebdo + capstone) sur ton profil Cursus public (URL `cursus.com/portfolio/[ton-handle]`). Toujours en ligne, partageable.
3. **Tous les badges** débloqués pendant le cursus (8 badges + bonus si capstone avec mention).
4. **Une lettre de recommandation** rédigée par moi (si mention ≥16/20).
5. **L'accès à vie premium** au produit Cursus.

### 20. Le certificat Cursus est-il "reconnu" ?

**Soyons honnêtes** : aujourd'hui, en juin 2026, Cursus est une marque inconnue. Le certificat **n'est pas un diplôme RNCP**. Il n'a pas le poids d'un certificat AWS ou OffSec.

**Ce qu'il vaut concrètement** :

- Une **preuve de réalisation cumulative et vérifiable** (portfolio + signature crypto) — c'est plus solide qu'un "certificat de complétion Coursera".
- Un **complément crédible à ton CV** quand tu candidates à un stage / alternance cybersec L2-L3.
- L'**inscription dans une démarche** (Open Badges 3.0) qui prend de l'ampleur dans le monde EdTech.
- **À horizon 18-24 mois**, on vise une reconnaissance écosystème (intégration LinkedIn officielle, partenariats écoles). Mais c'est de la promesse — ne base pas ta décision là-dessus.

**Si tu cherches un diplôme qualifiant**, tu ne le trouveras pas ici. **Si tu cherches une expérience pratique structurée et démontrable**, Cursus est exactement fait pour ça.

---

## Une dernière question pour la route

### Bonus — Et si j'ai encore des questions après avoir lu cette FAQ ?

Écris-moi directement : `mohamed@[domaine].com`. Je réponds **dans la journée** sur les questions pré-pilote. Si la question est utile à d'autres, je l'ajoute à cette FAQ (anonymisée).

À bientôt — j'espère sincèrement que tu vas dire oui.

**Mohamed Sadjad**
Fondateur Cursus
_Mise à jour FAQ : 2026-06-21_
