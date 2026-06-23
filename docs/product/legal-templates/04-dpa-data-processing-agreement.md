# Accord de Traitement des Données — Data Processing Agreement (DPA)

> **DRAFT — À VALIDER PAR UN AVOCAT AVANT MISE EN PROD.** Ce template est un point de départ rédigé en bonne foi mais n'est PAS un avis juridique. La conformité RGPD nécessite un audit personnalisé.

**Version : 1.0**
**Dernière mise à jour : [DATE À COMPLÉTER]**

---

## Préambule

Le présent Accord de Traitement des Données (ci-après « DPA » ou « Accord ») est conclu entre :

- **[RAISON SOCIALE DU CLIENT À COMPLÉTER]**, [forme juridique], dont le siège social est situé [adresse], immatriculée sous le numéro [SIREN], représentée par [Nom, Qualité],

ci-après dénommé(e) le **« Responsable de Traitement »** ou **« Client »**,

d'une part,

ET

- **[RAISON SOCIALE CURSUS À COMPLÉTER]**, [forme juridique], dont le siège social est situé [adresse], immatriculée sous le numéro [SIREN], représentée par [Nom, Qualité], éditrice de la plateforme « Cursus » accessible à l'adresse [https://cursus.app],

ci-après dénommée le **« Sous-traitant »** ou **« Cursus »**,

d'autre part,

ci-après désignés individuellement la « **Partie** » et collectivement les « **Parties** ».

---

## Contexte

Le Client a souscrit aux services de la plateforme Cursus pour l'encadrement de stages techniques au sein de sa structure (entreprise, école, centre de formation). Dans ce cadre, Cursus est amené à traiter des données à caractère personnel relatives notamment aux apprenants, aux formateurs et aux administrateurs désignés par le Client.

Le présent DPA encadre les obligations respectives des Parties conformément à l'article 28 du Règlement (UE) 2016/679 du 27 avril 2016 (ci-après le « RGPD ») et à la loi française n° 78-17 du 6 janvier 1978 modifiée (ci-après la « Loi Informatique et Libertés »).

Le présent DPA complète le contrat principal de services entre les Parties (ci-après le « Contrat Principal »). En cas de contradiction entre le Contrat Principal et le présent DPA s'agissant des données à caractère personnel, les stipulations du DPA prévalent.

---

## Article 1 — Définitions

Les termes ci-dessous, lorsqu'ils débutent par une majuscule, ont la signification suivante, conforme à l'article 4 du RGPD :

**« Données »** ou **« Données à Caractère Personnel »** : toute information se rapportant à une personne physique identifiée ou identifiable.

**« Personne Concernée »** : la personne physique à laquelle se rapportent les Données traitées.

**« Traitement »** : toute opération ou ensemble d'opérations effectuées sur des Données, notamment : collecte, enregistrement, organisation, structuration, conservation, adaptation, modification, extraction, consultation, utilisation, communication par transmission, diffusion, rapprochement, limitation, effacement, destruction.

**« Responsable de Traitement »** : la personne (morale ou physique) qui détermine les finalités et les moyens du Traitement.

**« Sous-traitant »** : la personne qui traite les Données pour le compte du Responsable de Traitement.

**« Sous-traitant Ultérieur »** : tout sous-traitant désigné par le Sous-traitant pour réaliser tout ou partie du Traitement objet du présent Accord.

**« Violation de Données »** : toute violation de la sécurité entraînant, de manière accidentelle ou illicite, la destruction, la perte, l'altération, la divulgation non autorisée ou l'accès non autorisé aux Données.

**« Autorité de Contrôle »** : autorité publique indépendante chargée de la protection des Données (en France : la CNIL).

**« Pays Tiers »** : pays situé hors de l'Espace Économique Européen et ne bénéficiant pas d'une décision d'adéquation.

---

## Article 2 — Objet et durée du Traitement

### 2.1. Objet

Le Client confie à Cursus le Traitement des Données nécessaires à la fourniture des services de la plateforme Cursus, à savoir :

- Hébergement et gestion des comptes utilisateurs (stagiaires, formateurs, co-formateurs, administrateurs)
- Hébergement et traitement des livrables pédagogiques
- Exécution du harnais de validation automatique
- Génération, signature et hébergement des certificats numériques
- Envoi d'emails transactionnels associés au service
- Mesure d'audience produit (analytics privacy-friendly)
- Conservation des logs de sécurité et d'audit

### 2.2. Durée

Le présent DPA prend effet à compter de la date de signature et reste en vigueur tant que le Contrat Principal entre les Parties est en cours d'exécution, ainsi que pendant toute période de conservation prévue à l'article 13.

---

## Article 3 — Description du Traitement

### 3.1. Nature du Traitement

Le Traitement consiste en : la collecte, l'enregistrement, l'organisation, la structuration, la conservation, l'adaptation, la consultation, l'utilisation, la communication par transmission, la limitation, l'effacement ou la destruction des Données nécessaires à la fourniture des services Cursus.

### 3.2. Finalités du Traitement

Le Traitement poursuit les finalités suivantes définies par le Client :

- Fournir aux stagiaires un accès cadencé à un parcours pédagogique structuré
- Permettre la soumission et la validation automatique des livrables
- Permettre aux formateurs le suivi et l'évaluation des apprenants
- Émettre, signer et permettre la vérification publique de certificats numériques
- Assurer la sécurité du service et la traçabilité des actions

### 3.3. Types de Données traitées

Les catégories de Données traitées sont les suivantes :

| Catégorie                      | Exemples                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Données d'identification       | Nom, prénom, email, identifiant interne                                                 |
| Données de connexion           | Logs IP, user-agent, horodatages                                                        |
| Données de profil              | Avatar, biographie, liens publics, identifiant GitHub                                   |
| Données pédagogiques           | URLs de repositories, livrables soumis, résultats du harnais, commentaires, certificats |
| Données techniques de sécurité | Hashs de mots de passe (argon2), secrets TOTP (chiffrés), tokens de session             |
| Données de communication       | Emails transactionnels envoyés, tickets de support                                      |
| Données analytiques            | Événements produit pseudonymes (PostHog)                                                |

### 3.4. Données spéciales

Aucune donnée relevant des catégories particulières au sens de l'article 9 du RGPD (origine raciale, opinions politiques, convictions religieuses, données de santé, etc.) ne fait l'objet du présent Traitement.

Si le Client venait à collecter, par l'intermédiaire de la plateforme, des données entrant dans ces catégories, il en assumerait seul la responsabilité et serait tenu de mettre en place les bases légales et les mesures complémentaires appropriées.

### 3.5. Catégories de Personnes Concernées

- Stagiaires inscrits dans les cohortes du Client
- Formateurs et co-formateurs désignés par le Client
- Administrateurs désignés par le Client
- Tiers visitant les portfolios publics ou vérifiant les certificats (logs IP uniquement, anonymisés)

### 3.6. Localisation du Traitement

Les Données sont principalement hébergées et traitées au sein de l'**Union européenne** (région Frankfurt pour la base de données et le stockage, instance EU pour les services d'erreur et d'analytics). Certains sous-traitants ultérieurs basés hors UE peuvent accéder aux Données : voir Annexe 2.

---

## Article 4 — Obligations du Sous-traitant Cursus

Conformément à l'article 28 du RGPD, Cursus s'engage à :

### 4.1. Documentation des instructions

Traiter les Données **uniquement sur instruction documentée** du Client, y compris en ce qui concerne les transferts hors UE, sauf si une obligation légale l'oblige à procéder autrement, auquel cas Cursus en informera le Client préalablement, sauf si le droit applicable interdit cette information pour des motifs importants d'intérêt public.

Les instructions initiales du Client sont constituées par le Contrat Principal et le présent DPA. Toute instruction complémentaire est consignée par écrit (email, ticket support).

### 4.2. Confidentialité

Garantir que les personnes autorisées à traiter les Données sous l'autorité de Cursus :

- Sont soumises à une obligation contractuelle ou légale de confidentialité
- Sont formées à la protection des Données
- Disposent d'un accès strictement limité au périmètre nécessaire à leurs fonctions (principe du moindre privilège)

### 4.3. Sécurité

Mettre en œuvre les mesures techniques et organisationnelles appropriées au sens de l'article 32 du RGPD, telles que décrites à l'article 5 ci-dessous et détaillées en Annexe 1.

### 4.4. Sous-traitance ultérieure

Respecter les conditions de l'article 6 du présent DPA pour le recours à des sous-traitants ultérieurs.

### 4.5. Droits des Personnes Concernées

Aider le Client à répondre aux demandes d'exercice des droits des Personnes Concernées (articles 12 à 22 du RGPD), notamment via :

- Des fonctionnalités self-service dans la plateforme (téléchargement, rectification, suppression)
- Une assistance technique aux demandes complexes (sur sollicitation du Client, dans un délai de 10 jours ouvrés)

### 4.6. Assistance générale

Aider le Client à respecter ses propres obligations RGPD, notamment :

- Notification des violations de Données (article 7 du présent DPA)
- Analyses d'impact sur la protection des données (PIA / AIPD) si nécessaire
- Consultations préalables auprès de l'Autorité de Contrôle

### 4.7. Suppression ou restitution

À l'issue du Contrat Principal, supprimer ou restituer les Données conformément à l'article 13 ci-dessous.

### 4.8. Mise à disposition des informations

Mettre à la disposition du Client toutes les informations nécessaires pour démontrer le respect des obligations prévues à l'article 28 du RGPD, et permettre la réalisation d'audits dans les conditions de l'article 12 ci-dessous.

### 4.9. Tenue d'un registre

Tenir un registre des Traitements effectués pour le compte du Client, conformément à l'article 30.2 du RGPD.

### 4.10. Information du Client

Informer immédiatement le Client si une instruction de ce dernier constitue, selon Cursus, une violation du RGPD ou d'autres dispositions applicables.

---

## Article 5 — Sécurité des données

### 5.1. Mesures techniques

Cursus met en œuvre, au minimum, les mesures techniques suivantes :

- **Chiffrement en transit** : TLS 1.3, HSTS activé, certificats valides
- **Chiffrement au repos** : base de données PostgreSQL chiffrée AES-256, stockage objets chiffré
- **Authentification** : mots de passe hashés (argon2id, paramètres OWASP), 2FA TOTP obligatoire pour les rôles administratifs
- **Cloisonnement** : Row-Level Security (RLS) au niveau base de données, isolation stricte des cohortes
- **Contrôle d'accès** : RBAC granulaire, principe du moindre privilège
- **Audit logs** : traçabilité horodatée des actions sensibles
- **Sauvegardes** : quotidiennes, chiffrées, conservées 30 jours, testées trimestriellement
- **Sécurité applicative** : en-têtes CSP, CSRF, XSS protection, rate limiting (Upstash)
- **Sécurité dépendances** : monitoring automatique des vulnérabilités, mises à jour régulières
- **Secrets management** : variables d'environnement chiffrées, rotation périodique
- **Détection** : monitoring d'intrusion, alertes automatiques sur événements anormaux

### 5.2. Mesures organisationnelles

- Politique de sécurité documentée et revue annuellement
- Formation continue du personnel à la cybersécurité et à la protection des données
- Engagements de confidentialité signés par tous les intervenants
- Politique de gestion des incidents documentée et testée
- Revues d'accès trimestrielles
- Politique BYOD encadrée (le cas échéant)

### 5.3. Mise à jour des mesures

Cursus s'engage à faire évoluer ses mesures de sécurité en fonction de l'état de l'art, des risques identifiés et des recommandations des autorités. Toute modification substantielle des mesures de sécurité de l'Annexe 1 fait l'objet d'une notification au Client.

### 5.4. Annexe technique

Le détail des mesures techniques et organisationnelles figure en **Annexe 1** du présent DPA.

---

## Article 6 — Sous-traitance ultérieure

### 6.1. Autorisation générale

Le Client autorise Cursus à recourir à des sous-traitants ultérieurs pour les besoins de la fourniture du Service, sous réserve du respect des conditions ci-dessous.

### 6.2. Liste actuelle

La liste des sous-traitants ultérieurs au jour de la signature du DPA figure en **Annexe 2**. Elle est également publiée et tenue à jour à l'adresse [https://cursus.app/subprocessors].

### 6.3. Notification préalable de changement

Cursus s'engage à notifier le Client de tout projet d'ajout ou de remplacement d'un sous-traitant ultérieur avec un préavis de **30 jours** minimum avant son entrée en vigueur effective.

### 6.4. Droit d'objection

Le Client dispose d'un délai de **30 jours** à compter de la notification pour formuler une objection raisonnée et documentée par écrit. En cas d'objection, les Parties s'efforceront de trouver une solution amiable. À défaut, le Client pourra résilier le Contrat Principal sans pénalité, avec un préavis adapté, sous réserve qu'il s'agisse d'un motif documenté lié au RGPD.

### 6.5. Garanties contractuelles

Cursus s'engage à imposer à tout sous-traitant ultérieur, par contrat écrit, des obligations en matière de protection des Données équivalentes à celles du présent DPA, et notamment :

- Le respect des principes de l'article 28 du RGPD
- La mise en œuvre de mesures techniques et organisationnelles appropriées
- Le respect des restrictions de localisation et des garanties de transfert hors UE

### 6.6. Responsabilité

Cursus reste pleinement responsable devant le Client de l'exécution par le sous-traitant ultérieur de ses obligations en matière de protection des Données.

---

## Article 7 — Droits des Personnes Concernées

### 7.1. Réception des demandes

Si une Personne Concernée s'adresse directement à Cursus pour exercer ses droits (accès, rectification, effacement, opposition, limitation, portabilité), Cursus :

- Notifie au Client la demande dans un délai de 5 jours ouvrés (sauf urgence imposant une action immédiate)
- Ne répond pas directement à la demande sans instruction du Client, sauf si l'identité du Responsable de Traitement effectif n'est pas évidente pour la Personne Concernée et qu'une orientation immédiate est nécessaire

### 7.2. Assistance technique

Cursus met à disposition du Client :

- Des fonctionnalités d'**export** des données d'un utilisateur en format JSON (portabilité)
- Des fonctionnalités de **suppression / anonymisation** des données d'un utilisateur
- Une fonctionnalité de **rectification** depuis le profil utilisateur
- Une assistance technique pour les demandes complexes (sur ticket, délai 10 jours ouvrés)

### 7.3. Délais

Cursus s'engage à réaliser les actions d'assistance dans un délai compatible avec le délai légal d'un mois prévu par l'article 12.3 du RGPD pour la réponse aux Personnes Concernées.

---

## Article 8 — Notification de violation

### 8.1. Délai de notification

En cas de Violation de Données affectant les Données du Client, Cursus s'engage à notifier le Client **dans les meilleurs délais et au plus tard 48 heures** après en avoir pris connaissance, afin de permettre au Client de respecter son propre délai de notification de 72 heures à la CNIL.

### 8.2. Contenu de la notification

La notification adressée au Client comporte au minimum :

- La nature de la violation, y compris, si possible, les catégories et le nombre approximatif de Personnes Concernées et d'enregistrements affectés
- Le nom et les coordonnées du DPO ou point de contact de Cursus
- La description des conséquences probables de la violation
- Les mesures prises ou proposées pour remédier à la violation et atténuer les éventuelles conséquences négatives
- Les éléments dont Cursus dispose au moment de la notification, complétés ultérieurement si nécessaire

### 8.3. Coopération

Cursus apporte au Client toute l'assistance raisonnablement nécessaire pour :

- Notifier l'Autorité de Contrôle (CNIL)
- Communiquer la violation aux Personnes Concernées le cas échéant
- Documenter la violation conformément à l'article 33.5 du RGPD

### 8.4. Mesures correctives

Cursus met en œuvre, sans délai et à ses frais, toutes les mesures techniques et organisationnelles nécessaires pour mettre fin à la violation, en atténuer les effets, et prévenir sa réoccurrence.

---

## Article 9 — Transferts hors Union européenne

### 9.1. Localisation préférentielle

Cursus s'engage à privilégier l'hébergement et le traitement des Données au sein de l'Union européenne (région Frankfurt notamment).

### 9.2. Transferts hors UE

Lorsqu'un transfert hors UE est rendu nécessaire par le recours à un sous-traitant ultérieur (par exemple : Vercel, Resend, GitHub, basés aux USA), Cursus met en œuvre les garanties prévues au Chapitre V du RGPD, et notamment :

- **Clauses Contractuelles Types** de la Commission européenne (décision 2021/914)
- **Évaluation d'impact des transferts** (TIA) post-Schrems II
- Mesures techniques complémentaires : chiffrement, pseudonymisation
- Adhésion du sous-traitant à un dispositif d'adéquation reconnu (ex. Data Privacy Framework) lorsque disponible

### 9.3. Information du Client

Cursus informe le Client de tout transfert hors UE et des garanties mises en œuvre. La liste des localisations figure en Annexe 2.

---

## Article 10 — Analyses d'impact (AIPD)

Cursus apporte au Client, à la demande et dans la mesure de ses moyens raisonnables, l'assistance nécessaire à la réalisation d'une analyse d'impact relative à la protection des données (AIPD / PIA) au sens de l'article 35 du RGPD, ainsi qu'aux éventuelles consultations préalables de l'Autorité de Contrôle au sens de l'article 36.

L'assistance comprend notamment :

- Documentation technique sur les mesures de sécurité (cf. Annexe 1)
- Description des flux de données
- Évaluation des risques inhérents au Traitement
- Recommandations d'atténuation

Cette assistance est fournie à titre gracieux dans une limite raisonnable. Au-delà, elle peut faire l'objet d'une facturation au temps passé, après accord écrit du Client.

---

## Article 11 — Registre du Traitement

Conformément à l'article 30.2 du RGPD, Cursus tient un registre de toutes les catégories d'activités de Traitement effectuées pour le compte du Client, contenant :

- L'identité et les coordonnées de Cursus, du Client et, le cas échéant, du DPO
- Les catégories de Traitement effectuées pour le compte du Client
- Le cas échéant, les transferts vers un Pays Tiers, y compris l'identification de ce Pays Tiers et les garanties appropriées
- Une description générale des mesures de sécurité techniques et organisationnelles

Ce registre est tenu à la disposition de l'Autorité de Contrôle et peut être communiqué au Client sur demande.

---

## Article 12 — Audit

### 12.1. Droit d'audit

Le Client dispose d'un droit d'audit pour vérifier le respect par Cursus de ses obligations au titre du présent DPA. Cet audit peut être réalisé :

- **Par le Client lui-même**, à ses frais
- **Par un tiers mandaté** par le Client (cabinet d'audit indépendant, soumis à confidentialité)

### 12.2. Modalités

- Préavis écrit de **30 jours** minimum, sauf en cas d'urgence justifiée (violation avérée)
- Limité à **une fois par an**, sauf nouvelles obligations légales ou incident
- Conduit pendant les heures de bureau, sans perturbation déraisonnable du service
- Périmètre proportionné aux finalités de l'audit
- Confidentialité absolue des informations consultées

### 12.3. Alternatives à l'audit sur site

Pour faciliter la conformité sans perturber l'exploitation, Cursus peut proposer au Client :

- La communication de certifications externes (ISO 27001, SOC 2, HDS le cas échéant)
- Des rapports d'audit réalisés par des tiers indépendants
- Des questionnaires de conformité (CAIQ, etc.)

Si le Client accepte ces alternatives, elles sont réputées satisfaire aux obligations d'audit pour la période concernée.

### 12.4. Frais

Les frais d'audit sont à la charge du Client. Si l'audit révèle une non-conformité substantielle imputable à Cursus, les frais sont remboursés par Cursus.

---

## Article 13 — Fin du contrat — Sort des Données

### 13.1. Choix du Client

À l'expiration ou à la résiliation du Contrat Principal, et selon le choix exprès du Client formulé dans un délai de **30 jours** :

- **Option 1** : Cursus restitue au Client l'ensemble des Données dans un format ouvert et structuré (JSON, exports SQL), via une procédure d'export sécurisée
- **Option 2** : Cursus procède à la suppression définitive des Données

### 13.2. Confirmation de suppression

À l'issue de la suppression, Cursus fournit au Client une attestation écrite de suppression, indiquant la date, le périmètre et la méthode utilisée.

### 13.3. Exceptions à la suppression

Sont exclues de l'obligation de suppression :

- Les **métadonnées des certificats émis**, conservées 10 ans pour permettre la vérification publique (intérêt légitime d'attestation pédagogique durable), sauf demande de révocation publique exercée par la Personne Concernée elle-même
- Les **logs d'audit**, conservés conformément à leurs durées propres (5 ans)
- Les **données comptables et facturation**, conservées conformément à leurs obligations légales (10 ans, Code de commerce)
- Les Données dont la conservation est imposée par une obligation légale s'appliquant à Cursus

Ces exceptions sont mentionnées dans l'attestation de suppression.

### 13.4. Sauvegardes

Les Données présentes dans les sauvegardes sont supprimées au plus tard à l'expiration du cycle de rotation des sauvegardes (30 jours), sans qu'aucune restauration ne soit techniquement possible au-delà.

### 13.5. Délai

L'ensemble des opérations de restitution / suppression sont réalisées dans un délai maximum de **60 jours** à compter de l'instruction du Client.

---

## Article 14 — Responsabilité

### 14.1. Principes

Chaque Partie est responsable du respect des obligations qui lui incombent au titre du RGPD et du présent DPA.

### 14.2. Responsabilité de Cursus

La responsabilité de Cursus ne peut être engagée que pour les manquements à ses propres obligations résultant du présent DPA, conformément à l'article 82.2 du RGPD.

### 14.3. Plafond

Sauf en cas de faute lourde ou intentionnelle, la responsabilité totale et cumulée de Cursus au titre du présent DPA est plafonnée au plafond prévu au Contrat Principal, sans pouvoir excéder le montant facturé au Client sur les 12 mois précédant le fait générateur.

### 14.4. Assurance

Cursus déclare avoir souscrit une assurance Responsabilité Civile Professionnelle couvrant les risques liés à la fourniture du service, et notamment les risques cyber.

---

## Article 15 — Dispositions générales

### 15.1. Hiérarchie

En cas de contradiction entre le présent DPA et le Contrat Principal sur les questions relatives à la protection des Données, les stipulations du présent DPA prévalent.

### 15.2. Modification

Le présent DPA peut être modifié d'un commun accord écrit entre les Parties. Cursus peut proposer des évolutions pour intégrer des évolutions réglementaires ou de pratiques de sécurité ; ces évolutions sont applicables sauf objection écrite du Client dans un délai de 30 jours.

### 15.3. Indépendance des clauses

Si une ou plusieurs stipulations du présent DPA sont déclarées nulles ou inapplicables, les autres stipulations conservent leur force et leur portée.

### 15.4. Loi applicable et juridiction

Le présent DPA est régi par le droit français. Tout litige relatif à son interprétation ou à son exécution sera de la compétence des tribunaux compétents tels que désignés au Contrat Principal.

### 15.5. Notification

Toute notification au titre du présent DPA est valablement effectuée par email aux adresses suivantes :

- Pour le Client : [email DPO Client à compléter]
- Pour Cursus : [dpo@cursus.app]

---

## Signatures

**Pour le Client**

Nom : [À COMPLÉTER]
Qualité : [À COMPLÉTER]
Date : [À COMPLÉTER]
Signature :

**Pour Cursus**

Nom : [À COMPLÉTER]
Qualité : [À COMPLÉTER]
Date : [À COMPLÉTER]
Signature :

---

## Annexe 1 — Mesures techniques et organisationnelles

### A1.1 Mesures techniques

| Domaine                      | Mesure                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| **Chiffrement transit**      | TLS 1.3, HSTS, HTTPS only                                                          |
| **Chiffrement repos**        | AES-256 sur base PostgreSQL Supabase et stockage objets                            |
| **Authentification**         | Mots de passe argon2id, paramètres OWASP, longueur min 12 caractères               |
| **MFA**                      | TOTP obligatoire pour Formateurs/Admin, optionnel Stagiaires                       |
| **Cloisonnement données**    | Row-Level Security (RLS) Supabase, isolation par cohorte                           |
| **Contrôle d'accès**         | RBAC granulaire, principe du moindre privilège                                     |
| **Audit logs**               | Horodatage, IP, action, ressource — conservation 5 ans                             |
| **Sauvegardes**              | Quotidiennes, chiffrées, conservation 30 jours, tests de restauration trimestriels |
| **Anti-DoS / Rate limiting** | Upstash Redis, règles par endpoint                                                 |
| **Sécurité applicative**     | CSP, CSRF, XSS protection, Content-Security-Policy strict                          |
| **Vulnérabilités**           | Dependabot, audit npm automatisé, scan SAST en CI                                  |
| **Secrets**                  | Variables d'environnement chiffrées, rotation périodique                           |
| **Monitoring**               | Sentry pour erreurs, alertes sur événements anormaux                               |
| **Code review**              | Obligatoire avant merge, CI verte requise                                          |

### A1.2 Mesures organisationnelles

| Domaine               | Mesure                                                        |
| --------------------- | ------------------------------------------------------------- |
| **Politique**         | Politique de sécurité documentée, revue annuelle              |
| **Formation**         | Formation cybersécurité et RGPD à l'embauche, rappels annuels |
| **Confidentialité**   | NDA signé par tous les intervenants                           |
| **Habilitations**     | Revue trimestrielle, principe du moindre privilège            |
| **Gestion incidents** | Procédure documentée, exercice annuel                         |
| **Continuité**        | Plan de continuité d'activité documenté                       |
| **Sous-traitants**    | DPA systématique, due diligence avant onboarding              |
| **DPO**               | Désigné, contactable à dpo@cursus.app                         |

### A1.3 Tests et certifications

Cursus s'engage à un objectif de certification ISO 27001 dans un délai de [À COMPLÉTER selon roadmap], et à des tests d'intrusion annuels réalisés par un prestataire indépendant.

---

## Annexe 2 — Liste des sous-traitants ultérieurs

Liste à jour également publiée à : [https://cursus.app/subprocessors]

| Sous-traitant           | Localisation            | Finalité                                 | Garanties transfert       |
| ----------------------- | ----------------------- | ---------------------------------------- | ------------------------- |
| Supabase Inc.           | Frankfurt (UE)          | Base PostgreSQL, Auth, Storage, Realtime | DPA + CCT (cas accès USA) |
| Vercel Inc.             | Edge (préférence UE)    | Hébergement Nuxt, edge functions         | DPA + CCT + DPF           |
| Resend Inc.             | Région EU si disponible | Emails transactionnels                   | DPA + CCT                 |
| Sentry                  | Frankfurt (UE)          | Reporting d'erreurs                      | DPA + instance EU         |
| PostHog                 | Cloud EU                | Analytics produit                        | DPA + instance EU         |
| Upstash Inc.            | Edges EU                | Cache Redis, rate limiting               | DPA + CCT                 |
| Inngest Inc.            | USA (régions multiples) | File d'attente, cron                     | DPA + CCT                 |
| GitHub Inc. (Microsoft) | Datacenters Microsoft   | Exécution Harnais (Actions)              | DPA + CCT + DPF           |

Toute évolution est notifiée au Client avec un préavis de 30 jours conformément à l'article 6.

---

_Fin du DPA — version 1.0_
