# 02 — Personas et rôles

Quatre rôles distincts dans le système. Les trois premiers sont des **utilisateurs actifs** (ils se connectent et agissent). Le quatrième est plus rare (admin technique/RH).

---

## Persona 1 — Karim, le Stagiaire

### Profil

- 20 ans, étudiant en 1ère année d'informatique (peut aussi être L2, L3, M1, M2 selon le contexte)
- Stage de fin d'année, durée 1 à 3 mois
- A déjà touché un peu de code (HTML basique, peut-être Python) mais pas de stack pro
- Apprend par la pratique, perd vite patience avec la théorie pure
- A un compte GitHub mais l'utilise peu
- Travaille principalement seul, à distance ou sur site selon les jours

### Objectif principal

**Acquérir des compétences concrètes et reproductibles** qui lui serviront pour son métier ou pour la suite de ses études. Pouvoir dire à la fin : "j'ai construit X, Y, Z et je sais les refaire."

### Frustrations actuelles (avant Cursus)

- "Je ne sais pas par où commencer, il y a trop de ressources sur internet."
- "Je suis bloqué mais je n'ose pas déranger le formateur pour une bêtise."
- "Je ne sais pas si ce que je fais est bien ou pas — j'attends la semaine prochaine pour avoir un retour."
- "À la fin du stage, je n'ai rien de tangible à montrer."

### Ce que Cursus lui apporte

- Un parcours **clair et cadencé** : il sait exactement quoi faire cette semaine, et ce qui vient après
- Un **retour automatique immédiat** sur ses livrables (succès / échec / quoi corriger)
- Un **portfolio public** qui se construit en temps réel, qu'il peut partager
- Des **badges** qui matérialisent ses acquis sans le comparer aux autres
- Un **canal d'alerte** pour signaler qu'il est bloqué, sans avoir à hésiter

### Cas d'usage typique au quotidien

- Matin : ouvre Cursus, voit "Semaine 3 / Module Git avancé / Livrable : faire une PR avec 3 commits et la merger via squash"
- Suit les ressources liées (article + vidéo), pratique sur son repo perso
- Pousse son livrable, le harnais valide ou non
- Si échec, lit le rapport du harnais et corrige
- Si bloqué depuis 24h, clique sur "Je suis bloqué" → notif au formateur
- Reçoit le commentaire du formateur dans la journée, débloque

### Métrique perso (ce qu'il voit dans son app)

- Sa progression sur le cursus (graphique de % de modules complétés)
- Ses XP cumulés et l'objectif du mois
- Ses badges débloqués et ceux à venir
- Son portfolio public (toujours accessible, fier de le montrer)

---

## Persona 2 — Mohamed, le Formateur principal (lead)

### Profil

- 30-45 ans, ingénieur senior / lead tech
- En charge d'une cohorte de 5 à 20 stagiaires sur 2-3 mois
- Ne peut pas dédier plus de **2-3h par jour** au suivi (a ses propres responsabilités)
- A déjà encadré des stagiaires "à l'ancienne" (WhatsApp, mails, mémoire)
- Veut industrialiser sans déshumaniser

### Objectif principal

**Maximiser la qualité d'apprentissage de chaque stagiaire en minimisant le temps de gestion administrative et de suivi répétitif.** Intervenir là où il apporte de la valeur (déblocage technique, conseil de carrière, capstone), pas pour faire le secrétaire.

### Frustrations actuelles (avant Cursus)

- "Je passe 30 minutes par jour à demander 'où en es-tu ?' à chacun."
- "Je découvre qu'un stagiaire est largué 3 semaines trop tard."
- "Je n'ai aucune comparabilité entre les promotions, je ne sais pas si ça marche."
- "Je passe du temps à vérifier des choses qu'un script pourrait vérifier (le site est-il en ligne, le repo existe-t-il...)."

### Ce que Cursus lui apporte

- Un **dashboard de cohorte** qui montre instantanément qui est où, qui est en alerte
- Des **alertes ciblées** : il n'est dérangé que quand sa valeur ajoutée est nécessaire
- Un **harnais automatique** qui fait 80 % de la vérification mécanique à sa place
- Une **bibliothèque de cursus réutilisables** : il prépare une fois, réutilise N fois
- Une **trace de progression** comparable d'une cohorte à l'autre

### Pouvoirs spécifiques (différents de Karim)

- Créer / éditer un cursus
- Inviter des stagiaires (par email — pas d'inscription libre)
- Créer une cohorte (groupe de stagiaires sur un cursus avec dates de début/fin)
- Voir le dashboard cohorte
- Recevoir les alertes (notif dans l'app + email)
- Commenter un livrable, déclencher un override du harnais (validation manuelle exceptionnelle)
- Programmer et tenir une soutenance capstone
- Attribuer un badge manuel ("Mentor du jour")
- Émettre le certificat de fin de cursus

### Cas d'usage typique au quotidien

- Matin : ouvre le dashboard, voit "2 alertes : Sarah n'a pas livré depuis 48h, Ahmed a raté son quiz 2 fois"
- Clique sur Sarah → voit son historique, lui écrit un commentaire ciblé
- Clique sur Ahmed → voit ses tentatives, lui propose une ressource alternative ou planifie un appel
- Le reste de la journée : pas dérangé, le harnais valide les livrables normaux

### Métrique perso (ce qu'il voit dans son app)

- Vue cohorte : avancement médian, écarts-types, stagiaires en alerte
- Heures de "temps formateur" déclarées vs estimation économisée
- Taux de complétion vs cohortes précédentes

---

## Persona 3 — Aïcha, la Formatrice secondaire / Co-formateur

### Profil

- 28 ans, dev sénior, contribue à l'encadrement d'une cohorte sans en être le lead
- Vient en renfort sur certaines spécialités (par exemple : Aïcha intervient sur le module cybersécurité parce que c'est son expertise)
- Peut être plusieurs co-formateurs sur une même cohorte
- Disponibilité variable, parfois 1h par semaine seulement

### Objectif principal

**Apporter sa contribution experte sans s'engager sur la totalité du suivi.** Soit ponctuellement (revue d'un livrable spécifique), soit sur un module précis (elle "owne" le module cybersécurité d'un cursus).

### Frustrations actuelles

- "Quand Mohamed me demande de l'aide, je n'ai pas le contexte du stagiaire."
- "On m'envoie un lien WhatsApp et un repo GitHub, je dois reconstituer la situation."

### Ce que Cursus lui apporte

- Une **vue contextuelle** sur chaque stagiaire qu'on lui assigne
- La possibilité d'**owner un module** spécifique sur un cursus (elle reçoit les alertes uniquement pour ce module)
- Un rôle plus léger : pas de création de cursus, pas de gestion administrative

### Pouvoirs spécifiques

- Voir les stagiaires des cohortes auxquelles elle est rattachée
- Commenter les livrables des modules qu'elle owne
- Recevoir les alertes sur ces modules uniquement
- Participer à la soutenance capstone (en option)
- **Ne peut pas** : créer un cursus, inviter un stagiaire, fermer une cohorte

---

## Persona 4 — Yann, l'Admin / RH (rôle technique)

### Profil

- IT manager ou RH formation
- Configure l'outil une fois, intervient peu après
- A besoin de visibilité agrégée (combien de stagiaires, combien de cohortes, coût, etc.)

### Objectif principal

**Garder le contrôle administratif et la conformité** sans entrer dans le détail pédagogique.

### Pouvoirs spécifiques

- Gérer les utilisateurs (créer / désactiver des comptes formateur)
- Voir les **statistiques agrégées** (nombre de stagiaires actifs, cohortes en cours, taux de complétion global)
- Exporter les données (RGPD, reporting RH)
- Configurer les paramètres globaux (logo, branding interne, intégrations email, etc.)
- **Ne participe pas** à la pédagogie

### Note importante

**Au MVP, ce rôle peut être fusionné avec Formateur principal** (Mohamed assume les deux casquettes). Le séparer comme rôle distinct n'est nécessaire qu'à partir du moment où il y a vraiment plusieurs formateurs principaux et une vraie organisation.

---

## Synthèse des permissions (matrice rapide)

| Action                                  | Stagiaire | Formateur principal | Co-formateur | Admin |
| --------------------------------------- | :-------: | :-----------------: | :----------: | :---: |
| Voir son propre profil & portfolio      |    ✅     |         ✅          |      ✅      |  ✅   |
| Voir le portfolio public d'un autre     |   ✅\*    |         ✅          |      ✅      |  ✅   |
| Pousser un livrable                     |    ✅     |          —          |      —       |   —   |
| Voir dashboard cohorte                  |     —     |         ✅          |    ✅\*\*    |  ✅   |
| Inviter un stagiaire                    |     —     |         ✅          |      —       |  ✅   |
| Créer un cursus                         |     —     |         ✅          |      —       |   —   |
| Éditer un module dont on est owner      |     —     |         ✅          |      ✅      |   —   |
| Commenter un livrable                   |     —     |         ✅          |    ✅\*\*    |   —   |
| Override harnais (validation manuelle)  |     —     |         ✅          |    ✅\*\*    |   —   |
| Émettre certificat                      |     —     |         ✅          |      —       |  ✅   |
| Gérer utilisateurs / paramètres globaux |     —     |          —          |      —       |  ✅   |

\* Le portfolio est public **uniquement après validation du capstone**, sinon il est privé.
\*\* Limité aux cohortes/modules dont le co-formateur est rattaché.

---

## Hiérarchie de rôles en une phrase

> Un **Stagiaire** appartient à une **Cohorte**, animée par un **Formateur principal** (lead) éventuellement assisté de **Co-formateurs** spécialistes. L'**Admin** gère les comptes et la conformité, sans intervenir dans la pédagogie.
