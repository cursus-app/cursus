# Conditions Générales d'Utilisation — Cursus

> **DRAFT — À VALIDER PAR UN AVOCAT AVANT MISE EN PROD.** Ce template est un point de départ rédigé en bonne foi mais n'est PAS un avis juridique. La conformité RGPD nécessite un audit personnalisé.

**Dernière mise à jour : [DATE À COMPLÉTER]**
**Version : 1.0**

---

## Préambule

Les présentes Conditions Générales d'Utilisation (ci-après les « CGU ») régissent l'utilisation de la plateforme Cursus, accessible à l'adresse [https://cursus.app] (ci-après le « Service »), éditée par [RAISON SOCIALE À COMPLÉTER] (ci-après « l'Éditeur » ou « Cursus »).

Toute utilisation du Service implique l'acceptation pleine, entière et sans réserve des présentes CGU. Si l'Utilisateur n'accepte pas tout ou partie des CGU, il est invité à ne pas utiliser le Service.

L'Éditeur se réserve le droit de modifier les CGU à tout moment, conformément à l'article 11 ci-dessous.

---

## Article 1 — Objet

1.1. Les présentes CGU ont pour objet de définir les modalités et conditions dans lesquelles l'Éditeur met à disposition de l'Utilisateur le Service Cursus, ainsi que les droits et obligations des parties dans ce cadre.

1.2. Cursus est une plateforme web destinée à l'encadrement de stages techniques, fournissant :

- Un système de cadencement pédagogique structuré par cursus et par cohorte
- Un harnais de validation automatique des livrables hebdomadaires basé sur des outils d'intégration continue (notamment GitHub Actions)
- Un portfolio public de réalisations cumulatives par stagiaire
- Un dispositif de certification numérique vérifiable par tiers
- Des outils de suivi et d'intervention à destination des formateurs

  1.3. Le Service est accessible 24h/24, 7j/7, sous réserve des cas de force majeure, de maintenance programmée ou de défaillance des réseaux et serveurs (cf. article 8).

---

## Article 2 — Définitions

Dans les présentes CGU, les termes suivants, lorsqu'ils débutent par une majuscule, ont la signification ci-après :

**« Utilisateur »** : toute personne physique disposant d'un Compte sur le Service, quel que soit son rôle (Stagiaire, Formateur, Co-formateur, Administrateur).

**« Stagiaire »** : Utilisateur inscrit dans une Cohorte en qualité d'apprenant, en charge de produire les Livrables hebdomadaires et de soutenir un Capstone en fin de Cursus.

**« Formateur »** : Utilisateur disposant des droits d'encadrement pédagogique sur une ou plusieurs Cohortes, habilité à créer des Cursus, inviter des Stagiaires, commenter des Livrables et émettre des Certificats.

**« Co-formateur »** : Utilisateur intervenant à titre auxiliaire sur un ou plusieurs Modules d'un Cursus, sans droits administratifs globaux.

**« Administrateur »** : Utilisateur disposant des droits de gestion globale de l'instance (comptes, configuration, statistiques agrégées).

**« Compte »** : espace personnel sécurisé permettant à l'Utilisateur d'accéder aux fonctionnalités du Service en fonction de son rôle.

**« Cohorte »** : groupe identifié de Stagiaires suivant un même Cursus selon un calendrier déterminé, encadré par un Formateur lead et éventuellement assisté de Co-formateurs.

**« Cursus »** : programme pédagogique structuré en Modules hebdomadaires, défini par un Formateur, comportant des objectifs, des ressources, des Livrables et un Capstone final.

**« Module »** : unité pédagogique élémentaire d'un Cursus, généralement hebdomadaire, comportant des ressources, un objectif d'apprentissage et un Livrable attendu.

**« Livrable »** : production réalisée par le Stagiaire en réponse à un Module (typiquement : un dépôt de code source hébergé sur GitHub avec URL de déploiement), soumise au Harnais.

**« Harnais »** : ensemble de vérifications automatiques exécutées sur un Livrable pour évaluer sa conformité aux critères définis par le Formateur (notamment : disponibilité de l'URL, structure du dépôt, exécution des tests, conformité du linter, score Lighthouse).

**« Capstone »** : projet final cumulatif d'un Cursus, soutenu oralement devant le Formateur, validant l'atteinte des objectifs pédagogiques globaux.

**« Portfolio »** : page publique consolidant les Livrables validés d'un Stagiaire, accessible après validation du Capstone.

**« Certificat »** : attestation numérique d'achèvement émise par Cursus à l'issue d'un Cursus, conforme au standard W3C Open Badges 3.0, signée cryptographiquement et vérifiable par un tiers via une URL publique.

**« Contenu »** : toute donnée, texte, code source, image, document ou information publiée, transmise ou stockée par l'Utilisateur sur le Service.

**« Données Personnelles »** : toute information se rapportant à une personne physique identifiée ou identifiable, au sens du Règlement (UE) 2016/679 (RGPD).

---

## Article 3 — Inscription et création de compte

### 3.1. Modalité d'inscription

L'accès au Service se fait **exclusivement sur invitation**. Il n'existe pas d'inscription libre. Un Compte est créé :

- Soit à l'initiative d'un Formateur qui invite un Stagiaire ou un Co-formateur par adresse email ;
- Soit à l'initiative d'un Administrateur qui crée un Compte Formateur ;
- Soit à l'initiative de l'Éditeur dans le cadre d'un pilote ou d'une démonstration.

L'invitation est nominative et non transférable. Elle expire passé un délai de 7 jours si elle n'est pas activée.

### 3.2. Information à fournir

Lors de la première connexion, l'Utilisateur doit fournir les informations suivantes :

- Nom et prénom
- Adresse email valide (celle ayant reçu l'invitation)
- Mot de passe respectant les exigences de sécurité (minimum 12 caractères, mélange de caractères)
- Acceptation des présentes CGU et de la Politique de Confidentialité

L'Utilisateur peut compléter son profil avec :

- Une photographie de profil (avatar)
- Un identifiant GitHub (obligatoire pour les Stagiaires soumettant des Livrables)
- Une biographie courte
- Des liens publics (site personnel, LinkedIn)

### 3.3. Exactitude des informations

L'Utilisateur s'engage à fournir des informations exactes, sincères et à jour. Toute usurpation d'identité ou fourniture d'informations mensongères peut entraîner la suspension immédiate du Compte sans préavis ni indemnité.

### 3.4. Authentification renforcée (2FA)

L'activation de l'authentification à deux facteurs (TOTP) est :

- **Obligatoire** pour les rôles Formateur, Co-formateur et Administrateur
- **Fortement recommandée** pour les Stagiaires
- **Obligatoire** pour tout Utilisateur souhaitant émettre ou recevoir un Certificat

### 3.5. Unicité du Compte

Chaque Utilisateur ne peut détenir qu'un seul Compte actif. La création de Comptes multiples est interdite et peut entraîner leur suppression sans préavis.

### 3.6. Mineurs

L'usage du Service par un mineur de moins de 16 ans nécessite le recueil préalable du consentement parental. L'Éditeur se réserve le droit de demander à tout moment la preuve de ce consentement.

---

## Article 4 — Description du service

### 4.1. Fonctionnalités principales

Le Service propose les fonctionnalités suivantes, accessibles selon le rôle de l'Utilisateur :

**Pour le Stagiaire :**

- Consultation du Cursus auquel il est inscrit et des Modules associés
- Accès aux ressources pédagogiques liées à chaque Module
- Soumission de Livrables hebdomadaires par dépôt d'URL de repository GitHub
- Consultation du rapport du Harnais après chaque soumission
- Consultation et partage de son Portfolio public (après validation du Capstone)
- Téléchargement et partage de son Certificat
- Signalement de blocage à destination du Formateur

**Pour le Formateur :**

- Création et édition de Cursus et de Modules
- Définition des critères de validation du Harnais par Module
- Invitation de Stagiaires et création de Cohortes
- Consultation du dashboard de Cohorte
- Réception d'alertes ciblées (blocage Stagiaire, échec Harnais répété)
- Commentaire sur Livrables et déclenchement d'override exceptionnel du Harnais
- Programmation et conduite des soutenances Capstone
- Émission de Certificats

**Pour le Co-formateur :**

- Consultation contextuelle des Stagiaires des Cohortes auxquelles il est rattaché
- Commentaire sur les Livrables des Modules dont il est désigné responsable
- Participation à la soutenance Capstone (optionnelle)

**Pour l'Administrateur :**

- Gestion des Comptes Utilisateurs (création, désactivation)
- Accès aux statistiques agrégées
- Export de données (RGPD, reporting)
- Configuration globale (branding, intégrations email)

### 4.2. Harnais automatique de validation

4.2.1. Le Harnais s'exécute via des workflows GitHub Actions déclenchés à chaque soumission de Livrable. Il vérifie de manière automatisée et non discrétionnaire :

- La disponibilité de l'URL de déploiement (réponse HTTP 200)
- L'existence et la conformité structurelle du dépôt (présence d'un README, branches attendues, signature des commits le cas échéant)
- L'exécution réussie des tests unitaires fournis par le Formateur
- Le passage du linter configuré
- Le respect d'un seuil minimal de score Lighthouse (le cas échéant)

  4.2.2. Le résultat du Harnais est transmis au Stagiaire dans un délai indicatif de **5 minutes** (p95). En cas d'échec, un rapport détaillé est fourni, listant les checks échoués.

  4.2.3. Le Harnais peut faire l'objet d'un **override manuel par le Formateur**, par exemple en cas de défaillance temporaire d'un service tiers (indisponibilité GitHub Actions, panne d'un provider de déploiement).

  4.2.4. L'Éditeur ne garantit pas que le Harnais détecte 100 % des erreurs ni 100 % des cas de fraude. Il complète mais ne remplace pas l'évaluation humaine.

### 4.3. Portfolio public

4.3.1. Le Portfolio d'un Stagiaire devient public **uniquement après la validation de son Capstone**. Avant cette étape, le Portfolio est strictement privé.

4.3.2. Le Stagiaire peut à tout moment demander la dépublication de son Portfolio, conformément à son droit d'opposition (cf. Politique de Confidentialité).

4.3.3. Le Portfolio public contient : nom, prénom, photo (si fournie), liens publics, liste des Livrables validés avec leurs liens GitHub, Certificat associé.

### 4.4. Certificat numérique

4.4.1. Le Certificat est émis par le Formateur à l'issue d'un Cursus complété avec succès (Modules validés + Capstone soutenu).

4.4.2. Le Certificat est conforme au standard W3C Open Badges 3.0. Il comporte :

- L'identité du Stagiaire
- L'identité du Formateur et de l'Éditeur (émetteurs)
- La date d'émission
- Les compétences attestées
- Une signature cryptographique

  4.4.3. Chaque Certificat est accompagné d'une URL publique permettant à tout tiers d'en vérifier l'authenticité.

  4.4.4. Un Certificat émis ne peut être révoqué qu'en cas de fraude avérée constatée a posteriori (plagiat, usurpation d'identité). La révocation fait l'objet d'une notification au Stagiaire et d'une publication sur l'URL de vérification.

---

## Article 5 — Obligations de l'utilisateur

### 5.1. Usage légal et conforme

L'Utilisateur s'engage à utiliser le Service dans le respect des lois et règlements en vigueur, des présentes CGU et des bonnes pratiques numériques. Il s'engage notamment à ne pas :

- Publier de Contenu contraire à l'ordre public, aux bonnes mœurs ou aux droits de tiers
- Diffuser de Contenu à caractère injurieux, diffamatoire, raciste, xénophobe, sexiste, homophobe, ou portant atteinte à la dignité humaine
- Publier de Contenu pornographique ou impliquant des mineurs dans des situations inappropriées
- Promouvoir des activités illégales, des produits ou substances illicites
- Diffuser des contenus protégés par le droit d'auteur sans autorisation
- Soumettre comme Livrable du Contenu plagié, généré frauduleusement par une intelligence artificielle non autorisée, ou produit par un tiers se faisant passer pour le Stagiaire
- Tenter de contourner, désactiver ou falsifier le Harnais
- Conduire des attaques ou tests d'intrusion sur l'infrastructure sans autorisation écrite préalable de l'Éditeur
- Utiliser le Service à des fins de spam, phishing, ou diffusion de malwares
- Collecter ou extraire massivement des données du Service (scraping) sans autorisation

### 5.2. Sécurité du compte

L'Utilisateur est seul responsable de la confidentialité de ses identifiants. Il s'engage à :

- Conserver son mot de passe secret et ne le communiquer à personne
- Activer la 2FA dans les cas prévus à l'article 3.4
- Notifier sans délai l'Éditeur en cas d'utilisation non autorisée de son Compte (par email à [security@cursus.app])
- Se déconnecter à l'issue de chaque session sur un poste partagé

L'Utilisateur reconnaît que toute action effectuée depuis son Compte est présumée avoir été réalisée par lui-même, jusqu'à preuve contraire.

### 5.3. Contenu publié

5.3.1. L'Utilisateur garantit qu'il dispose de l'ensemble des droits nécessaires sur le Contenu qu'il publie sur le Service, en particulier en matière de droit d'auteur, de droit à l'image et de droit moral.

5.3.2. L'Utilisateur garantit que son Contenu n'enfreint aucun droit de tiers et qu'il n'engage pas la responsabilité de l'Éditeur. Il s'engage à indemniser l'Éditeur de toute réclamation, action ou condamnation résultant d'une publication non conforme.

5.3.3. L'Utilisateur conserve la propriété intellectuelle de son Contenu, conformément à l'article 6.

### 5.4. Coopération avec les formateurs

Le Stagiaire s'engage à coopérer de bonne foi avec son Formateur et ses Co-formateurs, à répondre aux sollicitations dans des délais raisonnables, et à participer aux échanges pédagogiques avec sérieux.

### 5.5. Signalement

L'Utilisateur s'engage à signaler à l'Éditeur tout Contenu manifestement illicite, tout comportement abusif ou toute faille de sécurité dont il aurait connaissance, par email à [abuse@cursus.app] ou [security@cursus.app].

---

## Article 6 — Propriété intellectuelle

### 6.1. Propriété du Service

6.1.1. La marque Cursus, le logo, la charte graphique, les éléments d'interface, les textes, illustrations, codes sources de la plateforme et toute autre composante du Service sont la propriété exclusive de l'Éditeur ou de ses ayants droit. Ils sont protégés par le droit français et international de la propriété intellectuelle.

6.1.2. Toute reproduction, représentation, modification, adaptation, publication, transmission ou exploitation de tout ou partie du Service sans autorisation écrite préalable de l'Éditeur est strictement interdite et constitue une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.

### 6.2. Propriété du contenu du Stagiaire

6.2.1. **Le Stagiaire conserve la pleine propriété de son Contenu**, notamment du code source qu'il produit en réponse aux Livrables, des projets qu'il publie dans son Portfolio, et de son Capstone.

6.2.2. En soumettant un Livrable, le Stagiaire concède à l'Éditeur une licence non exclusive, à titre gratuit, pour la durée de validité de son Compte et pour les besoins exclusifs du Service, des droits suivants :

- Hébergement et stockage du Livrable et de ses métadonnées
- Exécution du Harnais sur le Livrable
- Affichage du Livrable au Formateur, aux Co-formateurs et à l'Utilisateur lui-même
- Affichage du Livrable sur le Portfolio public **après acceptation explicite du Stagiaire**

  6.2.3. Cette licence prend fin à la suppression du Compte du Stagiaire, sauf pour les éléments nécessaires à la vérification du Certificat (cf. 6.3).

### 6.3. Certificat

6.3.1. Le Certificat est émis par l'Éditeur et le Formateur conjointement. Il atteste de la réussite d'un Cursus par le Stagiaire.

6.3.2. L'Éditeur conserve les métadonnées du Certificat (sans le Contenu détaillé) pour permettre sa vérification par des tiers, et ce **au-delà de la suppression du Compte**, conformément à la finalité d'attestation pédagogique. La conservation de ces métadonnées est notifiée au Stagiaire dans la Politique de Confidentialité.

6.3.3. Le Stagiaire peut demander la révocation publique de son Certificat (rendant inopérante la vérification par tiers), tout en conservant la possibilité de l'attester par d'autres moyens.

### 6.4. Contenu pédagogique des formateurs

6.4.1. Le Cursus, les Modules, les ressources, les tests fournis par le Formateur restent sa propriété intellectuelle. Le Formateur concède à l'Éditeur une licence non exclusive d'utilisation pour les besoins du Service.

6.4.2. Le Formateur peut exporter à tout moment son Cursus dans un format ouvert et le réutiliser en dehors du Service.

---

## Article 7 — Données personnelles

7.1. Le traitement des Données Personnelles par le Service est régi par la Politique de Confidentialité, document distinct des présentes CGU mais qui en fait partie intégrante. Elle est accessible à [https://cursus.app/privacy].

7.2. En utilisant le Service, l'Utilisateur reconnaît avoir pris connaissance de la Politique de Confidentialité et accepter le traitement de ses Données Personnelles dans les conditions qui y sont décrites.

7.3. Conformément au RGPD, l'Utilisateur dispose des droits d'accès, de rectification, d'effacement, de portabilité, d'opposition et de limitation. Il peut les exercer en écrivant à [dpo@cursus.app].

---

## Article 8 — Disponibilité du service

### 8.1. Engagement « best effort »

8.1.1. L'Éditeur met en œuvre les moyens techniques raisonnables pour assurer la continuité du Service. Il ne souscrit **aucun engagement contractuel de niveau de service (SLA)** au-delà de cet engagement de moyens, sauf accord particulier écrit.

8.1.2. Le Service peut être temporairement indisponible en raison :

- D'opérations de maintenance, programmées ou non
- De pannes affectant l'infrastructure de l'Éditeur ou de ses sous-traitants (notamment Supabase, Vercel)
- De cas de force majeure (attaque informatique, panne d'opérateur, catastrophe naturelle)
- De défaillances des réseaux publics (Internet)

### 8.2. Maintenance programmée

Les opérations de maintenance programmée sont annoncées avec un préavis raisonnable (idéalement 48h) via :

- Une bannière dans l'interface
- Un email aux Utilisateurs concernés (pour les opérations de plus de 30 minutes)
- Une publication sur la page de statut [status.cursus.app]

### 8.3. Sauvegardes

8.3.1. L'Éditeur effectue des sauvegardes quotidiennes des données du Service. La durée de conservation des sauvegardes est de 30 jours.

8.3.2. La restauration de données en cas de perte ou corruption est de la responsabilité de l'Éditeur dans le cadre d'un sinistre infrastructure, et de l'Utilisateur en cas de suppression volontaire de sa part.

---

## Article 9 — Limitation de responsabilité

### 9.1. Principes généraux

9.1.1. L'Éditeur s'engage à apporter tout le soin nécessaire à la fourniture du Service mais n'est tenu qu'à une **obligation de moyens**.

9.1.2. La responsabilité de l'Éditeur ne saurait être engagée :

- En cas de force majeure au sens de l'article 1218 du Code civil
- En cas d'utilisation anormale ou non conforme du Service par l'Utilisateur
- En cas de défaillance des équipements ou services tiers (notamment GitHub, Supabase, Vercel, fournisseur d'accès Internet)
- En cas de Contenu publié par un Utilisateur dont la responsabilité incombe à celui-ci
- En cas de perte de données résultant d'une action volontaire de l'Utilisateur
- Pour les conséquences d'une décision pédagogique d'un Formateur (validation, refus, override Harnais)

### 9.2. Garantie limitée

9.2.1. Le Service est fourni « en l'état » sans garantie d'aucune sorte, expresse ou implicite, autre que celles imposées par la loi.

9.2.2. L'Éditeur ne garantit pas que :

- Le Service répondra à tous les besoins spécifiques de l'Utilisateur
- Le Service sera ininterrompu, sécurisé ou exempt d'erreurs
- Les résultats du Harnais seront exempts d'erreurs ou d'omissions
- Les Certificats émis seront reconnus par tous les tiers (employeurs, institutions, etc.)

### 9.3. Plafond de responsabilité

Dans toute la mesure permise par la loi, la responsabilité totale et cumulée de l'Éditeur, toutes causes confondues, est limitée :

- Pour les Utilisateurs gratuits : au préjudice direct, démontré et certain, plafonné à un montant symbolique de 100 €
- Pour les Utilisateurs en relation contractuelle payante : au montant facturé au cours des 12 mois précédant le fait générateur

Les dommages indirects (perte d'exploitation, perte d'opportunité, atteinte à l'image) sont expressément exclus.

---

## Article 10 — Suspension et résiliation

### 10.1. Résiliation par l'Utilisateur

10.1.1. L'Utilisateur peut à tout moment fermer son Compte depuis son espace personnel ou en écrivant à [support@cursus.app].

10.1.2. La fermeture du Compte entraîne :

- La désactivation immédiate de l'accès au Service
- La dépublication du Portfolio public (le cas échéant)
- L'effacement ou l'anonymisation des Données Personnelles dans les conditions prévues par la Politique de Confidentialité
- La conservation des métadonnées des Certificats émis pour permettre leur vérification par des tiers

### 10.2. Suspension par l'Éditeur

10.2.1. L'Éditeur peut suspendre ou résilier un Compte de plein droit, sans préavis ni indemnité, en cas de :

- Violation grave ou répétée des présentes CGU
- Comportement illicite, frauduleux ou portant préjudice à des tiers ou à l'Éditeur
- Soumission de Livrables plagiés ou frauduleusement générés
- Tentative de contournement du Harnais
- Non-paiement d'une facture due (pour les Utilisateurs en relation contractuelle payante)
- Risque grave et imminent pour la sécurité du Service ou de ses Utilisateurs

  10.2.2. En cas de suspension, l'Utilisateur est notifié par email. Il peut contester la décision en écrivant à [support@cursus.app] dans un délai de 15 jours.

  10.2.3. La résiliation d'un Compte Stagiaire en cours de Cursus n'entraîne pas la révocation des Certificats déjà émis, sauf en cas de fraude avérée.

### 10.3. Cessation du Service

10.3.1. L'Éditeur se réserve le droit de cesser tout ou partie du Service, moyennant un préavis raisonnable d'au moins **3 mois** notifié par email à l'ensemble des Utilisateurs.

10.3.2. En cas de cessation, l'Éditeur mettra à disposition des Utilisateurs un outil d'export de leurs données personnelles et de leur Contenu, dans un format ouvert et structuré.

10.3.3. Les Certificats émis demeureront vérifiables pendant une durée minimale de **5 ans** après la cessation du Service, via une infrastructure dédiée maintenue par l'Éditeur ou un tiers désigné.

---

## Article 11 — Modification des CGU

11.1. L'Éditeur se réserve le droit de modifier les présentes CGU à tout moment, pour les motifs suivants :

- Évolution du Service (nouvelles fonctionnalités, modifications techniques)
- Évolution législative ou réglementaire
- Évolution des sous-traitants ou prestataires
- Correction d'erreurs ou clarification

  11.2. Les modifications mineures (corrections, clarifications) entrent en vigueur dès leur publication. Les modifications substantielles font l'objet d'une notification préalable par email aux Utilisateurs, au moins **30 jours** avant leur entrée en vigueur.

  11.3. La poursuite de l'utilisation du Service après l'entrée en vigueur des nouvelles CGU vaut acceptation. À défaut d'acceptation, l'Utilisateur peut résilier son Compte conformément à l'article 10.1.

  11.4. Les CGU applicables sont celles en vigueur au jour de l'utilisation du Service. L'Éditeur conserve un historique des versions accessible sur demande.

---

## Article 12 — Dispositions diverses

### 12.1. Convention de preuve

Les parties conviennent que les emails échangés, les logs du Service et les enregistrements horodatés des actions effectuées via les Comptes constituent des preuves valables et opposables. Ces éléments sont conservés conformément aux durées définies dans la Politique de Confidentialité.

### 12.2. Indépendance des clauses

Si une ou plusieurs stipulations des présentes CGU étaient déclarées nulles ou inapplicables par une décision judiciaire devenue définitive, les autres stipulations conserveraient toute leur force et leur portée.

### 12.3. Non-renonciation

Le fait pour l'Éditeur de ne pas se prévaloir d'un manquement de l'Utilisateur à l'une de ses obligations ne saurait être interprété comme une renonciation à se prévaloir ultérieurement de ce manquement.

### 12.4. Cession

L'Utilisateur ne peut céder son Compte à un tiers sans accord écrit préalable de l'Éditeur. L'Éditeur peut céder les présentes CGU à un tiers dans le cadre d'une opération de fusion, acquisition, scission ou transfert d'activité, après notification aux Utilisateurs.

### 12.5. Intégralité

Les présentes CGU, ensemble avec la Politique de Confidentialité et les Mentions Légales, constituent l'intégralité de l'accord entre les parties relatif à l'utilisation du Service. Elles annulent et remplacent tout accord antérieur, écrit ou oral, ayant le même objet.

---

## Article 13 — Droit applicable et juridiction compétente

### 13.1. Droit applicable

Les présentes CGU sont régies par le **droit français**, à l'exclusion de tout autre droit, et notamment des règles de conflit de lois.

### 13.2. Médiation

En cas de différend relatif à l'interprétation ou à l'exécution des présentes CGU, les parties s'efforceront de trouver une solution amiable dans un délai de 30 jours à compter de la notification du différend.

Conformément aux articles L.611-1 et suivants du Code de la consommation, l'Utilisateur consommateur peut recourir gratuitement à un médiateur de la consommation. Le médiateur compétent est [À COMPLÉTER — par exemple : Médiateur de la consommation FEVAD].

### 13.3. Juridiction

À défaut de résolution amiable, et sous réserve des règles d'ordre public applicables aux consommateurs, tout litige relatif aux présentes CGU sera de la compétence exclusive des **tribunaux du ressort de la Cour d'appel de [VILLE À COMPLÉTER — par défaut Paris]**.

---

## Contact

Pour toute question relative aux présentes CGU :

- Email : [legal@cursus.app]
- Adresse postale : [À COMPLÉTER]

---

_Fin des Conditions Générales d'Utilisation — version 1.0_
