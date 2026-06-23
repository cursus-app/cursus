# Politique de Confidentialité — Cursus

> **DRAFT — À VALIDER PAR UN AVOCAT AVANT MISE EN PROD.** Ce template est un point de départ rédigé en bonne foi mais n'est PAS un avis juridique. La conformité RGPD nécessite un audit personnalisé.

**Dernière mise à jour : [DATE À COMPLÉTER]**
**Version : 1.0**

---

## Préambule

La présente Politique de Confidentialité (ci-après la « Politique ») décrit la manière dont [RAISON SOCIALE À COMPLÉTER] (ci-après « Cursus », « nous », « notre » ou « l'Éditeur ») collecte, utilise, conserve et protège les données à caractère personnel des utilisateurs (ci-après les « Utilisateurs » ou « vous ») de la plateforme Cursus, accessible à l'adresse [https://cursus.app] (ci-après le « Service »).

Cette Politique est conforme au **Règlement (UE) 2016/679 du 27 avril 2016** relatif à la protection des personnes physiques à l'égard du traitement des données à caractère personnel et à la libre circulation de ces données (ci-après le « RGPD ») et à la loi française n° 78-17 du 6 janvier 1978 modifiée relative à l'informatique, aux fichiers et aux libertés (ci-après la « Loi Informatique et Libertés »).

En utilisant le Service, vous reconnaissez avoir pris connaissance de la présente Politique et en accepter les termes.

---

## 1. Identité du responsable de traitement

Le responsable du traitement des données personnelles est :

- **Raison sociale** : [À COMPLÉTER]
- **Forme juridique** : [SAS / SARL / EURL / Association à compléter]
- **Capital social** : [À COMPLÉTER si SA/SAS]
- **SIREN** : [À COMPLÉTER]
- **Siège social** : [Adresse à compléter]
- **Email** : [contact@cursus.app]
- **Téléphone** : [À COMPLÉTER]

### Délégué à la Protection des Données (DPO)

- **Identité** : [À COMPLÉTER — interne ou externe]
- **Email** : [dpo@cursus.app]
- **Adresse postale** : [À COMPLÉTER]

> **Note** : la désignation d'un DPO n'est obligatoire que dans les cas prévus à l'article 37 du RGPD. Compte tenu de la nature de Cursus (traitement de données pédagogiques pouvant concerner des mineurs et des données spéciales liées à des certifications), la désignation d'un DPO est **fortement recommandée**, même si elle n'est pas strictement obligatoire au démarrage.

---

## 2. Données collectées

Nous collectons et traitons les catégories de données suivantes :

### 2.1. Données de compte

Collectées lors de la création du Compte ou de l'invitation :

| Donnée                                              | Source                          | Obligatoire               |
| --------------------------------------------------- | ------------------------------- | ------------------------- |
| Nom et prénom                                       | Saisie utilisateur              | Oui                       |
| Adresse email                                       | Invitation + saisie utilisateur | Oui                       |
| Mot de passe (haché bcrypt/argon2)                  | Saisie utilisateur              | Oui                       |
| Rôle (Stagiaire / Formateur / Co-formateur / Admin) | Attribué par l'invitant         | Oui                       |
| Identifiant GitHub                                  | Saisie utilisateur              | Oui (Stagiaire)           |
| Avatar (photo de profil)                            | Upload utilisateur              | Non                       |
| Biographie courte                                   | Saisie utilisateur              | Non                       |
| Liens publics (site, LinkedIn)                      | Saisie utilisateur              | Non                       |
| Préférences (langue, thème, fuseau)                 | Saisie utilisateur              | Non                       |
| Secret TOTP (2FA, chiffré)                          | Génération système              | Oui pour Formateurs/Admin |

### 2.2. Données de navigation et techniques

Collectées automatiquement lors de l'utilisation du Service :

| Donnée                                                                    | Finalité                          | Conservation                         |
| ------------------------------------------------------------------------- | --------------------------------- | ------------------------------------ |
| Adresse IP                                                                | Sécurité, anti-abus, logs d'audit | 12 mois                              |
| User-Agent (navigateur, OS)                                               | Compatibilité, statistiques       | 12 mois                              |
| Logs de connexion (timestamp, IP, succès/échec)                           | Sécurité, audit                   | 12 mois                              |
| Logs d'action (CRUD significatifs : création cursus, émission certificat) | Audit, RGPD                       | 5 ans                                |
| Données d'erreur (stack traces, contexte)                                 | Debug, qualité                    | 90 jours                             |
| Identifiants de session (cookies)                                         | Authentification                  | Session ou 30 jours si "Se souvenir" |

### 2.3. Données pédagogiques (livrables)

Collectées lors de la soumission de Livrables :

| Donnée                                        | Source                          | Conservation           |
| --------------------------------------------- | ------------------------------- | ---------------------- |
| URL du repository GitHub                      | Saisie Stagiaire                | Durée du Compte + 1 an |
| URL de déploiement                            | Saisie Stagiaire                | Durée du Compte + 1 an |
| Métadonnées du dépôt (langage, structure)     | Récupération automatique GitHub | Durée du Compte + 1 an |
| Résultats du Harnais (succès/échec par check) | Génération système              | Durée du Compte + 1 an |
| Logs détaillés du Harnais                     | Génération système              | 90 jours               |
| Commentaires Formateurs                       | Saisie Formateur                | Durée du Compte        |
| Auto-évaluations Stagiaire                    | Saisie Stagiaire                | Durée du Compte        |

### 2.4. Données du portfolio public

Si le Stagiaire a validé son Capstone et accepté la publication :

| Donnée                                                | Source | Visibilité |
| ----------------------------------------------------- | ------ | ---------- |
| Nom, prénom, avatar                                   | Profil | Publique   |
| Liens publics                                         | Profil | Publique   |
| Liste des Livrables validés (URL, description courte) | Profil | Publique   |
| Certificat (URL de vérification, badge)               | Profil | Publique   |

### 2.5. Données du certificat

Conservées pour permettre la vérification publique :

| Donnée                                          | Conservation          |
| ----------------------------------------------- | --------------------- |
| Identité du Stagiaire (nom, prénom, hash email) | 10 ans après émission |
| Identité du Formateur émetteur                  | 10 ans après émission |
| Date d'émission                                 | 10 ans après émission |
| Compétences attestées                           | 10 ans après émission |
| Signature cryptographique                       | 10 ans après émission |
| URL de vérification publique                    | 10 ans après émission |

### 2.6. Données de communication

| Donnée                                 | Finalité                | Conservation           |
| -------------------------------------- | ----------------------- | ---------------------- |
| Emails envoyés/reçus (transactionnels) | Notifications, support  | 3 ans                  |
| Tickets de support                     | Traitement des demandes | 3 ans après résolution |
| Notifications in-app                   | Information Utilisateur | 90 jours               |

### 2.7. Données analytiques

Collectées via PostHog en mode privacy-friendly (sans cookies tiers) :

| Donnée                                           | Finalité                                      | Conservation |
| ------------------------------------------------ | --------------------------------------------- | ------------ |
| Pages visitées (URL anonymisée)                  | Compréhension usage                           | 12 mois      |
| Événements produit (clic CTA, complétion module) | Amélioration produit                          | 12 mois      |
| Identifiant pseudonyme (généré côté client)      | Corrélation des événements d'une même session | 12 mois      |

> Nous n'utilisons **pas** de cookies de tracking tiers (Google Analytics, Facebook Pixel, etc.).

### 2.8. Catégories particulières (article 9 RGPD)

Nous ne collectons **pas** sciemment de données sensibles au sens de l'article 9 du RGPD (origine raciale, opinions politiques, convictions religieuses, données biométriques, données de santé, orientation sexuelle).

L'Utilisateur s'engage à ne pas publier de telles données dans son profil, ses Livrables ou ses commentaires.

### 2.9. Données concernant les mineurs

Le Service peut concerner des Utilisateurs mineurs (Stagiaires de 16-17 ans notamment). Dans ce cas :

- L'inscription d'un mineur de moins de 16 ans nécessite le consentement parental préalable
- Nous limitons la collecte aux données strictement nécessaires
- Le Portfolio public d'un mineur ne peut être publié sans accord exprès du représentant légal

---

## 3. Finalités du traitement et bases légales

Chaque traitement repose sur une base légale identifiée conformément à l'article 6 du RGPD.

### 3.1. Fourniture du Service

| Finalité                                      | Base légale                                                           | Données concernées                  |
| --------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| Création et gestion du Compte                 | Exécution du contrat (CGU)                                            | Données de compte (§2.1)            |
| Authentification et sécurisation des sessions | Exécution du contrat                                                  | Email, mot de passe, 2FA            |
| Diffusion du Cursus et accès aux ressources   | Exécution du contrat                                                  | Profil + rattachement Cohorte       |
| Soumission et validation des Livrables        | Exécution du contrat                                                  | Données pédagogiques (§2.3)         |
| Suivi et intervention Formateur               | Exécution du contrat                                                  | Données pédagogiques + commentaires |
| Émission et vérification du Certificat        | Exécution du contrat + intérêt légitime (durabilité de l'attestation) | Données certificat (§2.5)           |

### 3.2. Sécurité et lutte contre la fraude

| Finalité                             | Base légale                                | Données concernées         |
| ------------------------------------ | ------------------------------------------ | -------------------------- |
| Détection des comportements abusifs  | Intérêt légitime de l'Éditeur              | Logs (§2.2), audit actions |
| Lutte contre le plagiat et la fraude | Intérêt légitime de l'Éditeur + Formateurs | Livrables + métadonnées    |
| Audit de sécurité                    | Obligation légale (RGPD art. 32)           | Logs                       |

### 3.3. Communication

| Finalité                                           | Base légale                         | Données concernées |
| -------------------------------------------------- | ----------------------------------- | ------------------ |
| Emails transactionnels (invitation, notifications) | Exécution du contrat                | Email              |
| Support utilisateur                                | Exécution du contrat                | Email, tickets     |
| Newsletter ou communications produit               | **Consentement** (opt-in explicite) | Email              |

> Tout email non transactionnel (newsletter, annonces produit, etc.) nécessite votre consentement explicite préalable. Vous pouvez le retirer à tout moment via le lien de désabonnement en pied d'email ou en écrivant à [dpo@cursus.app].

### 3.4. Amélioration du Service

| Finalité                          | Base légale      | Données concernées         |
| --------------------------------- | ---------------- | -------------------------- |
| Analyse statistique d'usage       | Intérêt légitime | Données analytiques (§2.7) |
| Détection des bugs et performance | Intérêt légitime | Données d'erreur (§2.2)    |
| Tests A/B sur des fonctionnalités | Intérêt légitime | Données analytiques        |

### 3.5. Conformité légale

| Finalité                                | Base légale                                      | Données concernées         |
| --------------------------------------- | ------------------------------------------------ | -------------------------- |
| Réponse aux réquisitions légales        | Obligation légale                                | Toutes données pertinentes |
| Conservation des preuves contractuelles | Obligation légale (Code civil, Code de commerce) | Logs, contrats             |
| Tenue de la comptabilité (cas payants)  | Obligation légale                                | Données de facturation     |

---

## 4. Destinataires des données

Vos données ne sont communiquées qu'aux destinataires strictement nécessaires à la fourniture du Service, listés ci-dessous.

### 4.1. Destinataires internes

- Personnel de l'Éditeur habilité (administrateurs techniques, support utilisateur, DPO), strictement dans le cadre de leurs fonctions et soumis à une obligation de confidentialité

### 4.2. Autres Utilisateurs du Service

Selon le rôle et la configuration :

| Donnée                                       | Visibilité                                                  |
| -------------------------------------------- | ----------------------------------------------------------- |
| Profil de Stagiaire (nom, avatar)            | Formateur, Co-formateurs et autres Stagiaires de la Cohorte |
| Livrables d'un Stagiaire                     | Formateur, Co-formateurs des Modules concernés              |
| Portfolio public (après validation Capstone) | Public (visiteurs du Service ou tiers via URL)              |
| Certificat                                   | Public (vérifiable via URL)                                 |
| Données du Formateur (nom, avatar)           | Stagiaires de ses Cohortes                                  |

### 4.3. Sous-traitants techniques

Nous recourons à des sous-traitants au sens de l'article 28 du RGPD, sélectionnés pour leur conformité et liés à nous par contrat (DPA) :

| Sous-traitant                                       | Finalité                                                                       | Localisation des données             | Garanties                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------- |
| **Supabase Inc.** (USA, infrastructure EU)          | Base de données PostgreSQL, authentification, stockage de fichiers, temps-réel | Région Frankfurt (EU)                | DPA Supabase + Clauses Contractuelles Types (CCT) |
| **Vercel Inc.** (USA)                               | Hébergement de l'application Nuxt, edge functions                              | Régions multiples avec préférence EU | DPA Vercel + CCT                                  |
| **Resend Inc.** (USA, infrastructure EU disponible) | Envoi d'emails transactionnels                                                 | Région EU si disponible              | DPA Resend + CCT                                  |
| **Sentry** (USA, instance EU disponible)            | Reporting d'erreurs                                                            | Instance EU (Frankfurt)              | DPA Sentry + CCT                                  |
| **PostHog Cloud EU**                                | Analytics produit privacy-friendly                                             | Région UE                            | DPA PostHog + traitement EU                       |
| **Upstash Inc.** (USA, edges EU)                    | Cache Redis, rate limiting                                                     | Région EU                            | DPA Upstash + CCT                                 |
| **Inngest Inc.** (USA)                              | File d'attente, tâches asynchrones                                             | Régions multiples                    | DPA Inngest + CCT                                 |
| **GitHub Inc.** (Microsoft, USA)                    | Exécution du Harnais (Actions), récupération des métadonnées des Livrables     | Datacenters Microsoft                | DPA GitHub + CCT                                  |
| **Stripe Inc.** (cas payants futurs)                | Paiement                                                                       | EU + USA                             | DPA Stripe + CCT                                  |

Nous tenons à jour une **liste publique de nos sous-traitants** à l'adresse [https://cursus.app/subprocessors]. Toute évolution est notifiée aux Utilisateurs avec un préavis de **30 jours**, leur permettant de s'opposer le cas échéant.

### 4.4. Autorités compétentes

En cas de réquisition légale ou judiciaire dûment formalisée, nous pouvons être amenés à transmettre vos données aux autorités compétentes (police, justice, CNIL).

### 4.5. En cas de cession

En cas de fusion, acquisition, scission ou transfert d'activité, vos données peuvent être transférées au repreneur, sous réserve qu'il s'engage à respecter la présente Politique. Vous en seriez informé préalablement et pourriez vous y opposer.

---

## 5. Transferts hors Union Européenne

### 5.1. Principe

Nous privilégions systématiquement l'hébergement de vos données dans l'**Union Européenne** (région Frankfurt pour Supabase, instance EU pour Sentry, datacenter EU pour PostHog).

### 5.2. Cas de transfert

Certains sous-traitants (Vercel, Resend, GitHub, Stripe, Inngest, Upstash) sont des entreprises américaines qui peuvent traiter ou avoir accès à des données depuis les USA, même lorsque l'hébergement principal est en UE.

### 5.3. Garanties mises en œuvre

Pour ces transferts hors UE, nous mettons en œuvre les garanties suivantes (article 46 RGPD) :

- **Clauses Contractuelles Types** (CCT) de la Commission européenne (décision 2021/914)
- **Évaluation d'impact des transferts** (TIA) pour les sous-traitants américains, conformément aux recommandations EDPB post-Schrems II
- **Adhésion au Data Privacy Framework** (DPF) lorsque le sous-traitant est certifié
- Mesures techniques complémentaires : chiffrement en transit (TLS 1.3), chiffrement au repos, anonymisation/pseudonymisation lorsque possible

### 5.4. Liste à jour

La liste exhaustive et à jour de nos sous-traitants, leurs localisations et les garanties applicables est publiée à [https://cursus.app/subprocessors].

---

## 6. Durée de conservation

Les durées de conservation sont définies en fonction des finalités et des obligations légales :

### 6.1. Données de compte

- **Compte actif** : durée d'utilisation du Service
- **Compte inactif** : alerte par email à 18 mois d'inactivité, suppression à 24 mois sans réaction

### 6.2. Données pédagogiques

- **Pendant le Cursus** : durée du Cursus
- **Après fin du Cursus** : conservation pendant la durée du Compte + 1 an
- **Après suppression du Compte** : anonymisation immédiate des Livrables (conservation agrégée pour statistiques) ; suppression des contenus identifiables

### 6.3. Certificats

- **Métadonnées du Certificat** : 10 ans après émission (durée correspondant à la valeur pédagogique attendue d'une attestation de compétences)
- **Possibilité de demander une révocation publique** (la métadonnée subsiste mais le statut public devient « révoqué à la demande »)

### 6.4. Logs

- **Logs de connexion (IP, user-agent)** : 12 mois
- **Logs d'action métier (audit)** : 5 ans (conformité, traçabilité)
- **Logs de debug détaillés** : 90 jours

### 6.5. Données analytiques

- **PostHog événements** : 12 mois (rolling)

### 6.6. Communications

- **Emails transactionnels** : 3 ans
- **Tickets de support** : 3 ans après résolution

### 6.7. Données comptables (cas payants)

- **Factures** : 10 ans (Code de commerce, art. L.123-22)

---

## 7. Vos droits

Conformément au RGPD, vous disposez des droits suivants sur vos Données Personnelles.

### 7.1. Droit d'accès (art. 15 RGPD)

Vous pouvez obtenir confirmation que vos données sont traitées et accéder à ces données ainsi qu'aux informations suivantes : finalités, catégories, destinataires, durée de conservation, droits, source des données, existence d'une prise de décision automatisée.

**Comment l'exercer** : depuis votre espace personnel, onglet « Mes données » → « Télécharger mes données » (export JSON), ou en écrivant à [dpo@cursus.app].

### 7.2. Droit de rectification (art. 16 RGPD)

Vous pouvez faire rectifier sans délai les données inexactes ou compléter les données incomplètes vous concernant.

**Comment l'exercer** : directement depuis votre profil utilisateur, ou par email à [dpo@cursus.app].

### 7.3. Droit à l'effacement (« droit à l'oubli », art. 17 RGPD)

Vous pouvez demander l'effacement de vos données dans les cas prévus par le RGPD (données plus nécessaires, retrait du consentement, opposition, traitement illicite, etc.).

**Limitations** :

- Les métadonnées de Certificat sont conservées pendant 10 ans pour permettre la vérification publique, conformément à l'intérêt légitime d'attestation pédagogique durable. Vous pouvez néanmoins demander la **révocation publique** du Certificat.
- Les logs d'audit (5 ans) sont conservés pour des motifs de sécurité et de conformité.

**Comment l'exercer** : depuis votre espace personnel, onglet « Mes données » → « Supprimer mon compte », ou par email à [dpo@cursus.app].

### 7.4. Droit à la limitation du traitement (art. 18 RGPD)

Vous pouvez demander que le traitement de vos données soit limité (gel temporaire) dans certains cas : contestation de l'exactitude, traitement illicite, opposition en cours d'examen, etc.

**Comment l'exercer** : par email à [dpo@cursus.app].

### 7.5. Droit à la portabilité (art. 20 RGPD)

Pour les données traitées sur base contractuelle ou sur consentement, vous pouvez récupérer vos données dans un format structuré, couramment utilisé et lisible par machine (JSON), et les transmettre à un autre responsable de traitement.

**Comment l'exercer** : depuis votre espace personnel, onglet « Mes données » → « Exporter mes données ».

### 7.6. Droit d'opposition (art. 21 RGPD)

Vous pouvez vous opposer à tout moment au traitement de vos données pour des motifs tenant à votre situation particulière (traitements fondés sur l'intérêt légitime) et sans motif pour la prospection.

**Comment l'exercer** : par email à [dpo@cursus.app] en précisant les motifs.

### 7.7. Droit de retirer son consentement (art. 7 RGPD)

Lorsque le traitement repose sur votre consentement (par exemple newsletter), vous pouvez le retirer à tout moment, sans que cela n'affecte la licéité du traitement antérieur.

**Comment l'exercer** : lien de désabonnement en bas de chaque email, ou par écrit à [dpo@cursus.app].

### 7.8. Droit de définir des directives post-mortem

Conformément à l'article 85 de la Loi Informatique et Libertés, vous pouvez définir des directives relatives au sort de vos données après votre décès. Vous pouvez désigner un tiers en charge de leur exécution.

**Comment l'exercer** : par email à [dpo@cursus.app].

### 7.9. Droit de ne pas faire l'objet d'une décision automatisée (art. 22 RGPD)

Le Harnais est un dispositif **partiellement automatisé** d'évaluation des Livrables, dont le résultat peut être pondéré ou outrepassé par le Formateur. Les décisions individuelles ayant des effets juridiques significatifs (émission/refus de Certificat) sont **toujours validées par un humain** (Formateur). Vous n'êtes donc pas soumis à une décision purement automatisée au sens de l'article 22 du RGPD.

Vous pouvez néanmoins contester un résultat du Harnais auprès de votre Formateur, qui peut procéder à un override manuel.

---

## 8. Comment exercer vos droits

### 8.1. Modalités

Vous pouvez exercer vos droits selon les modalités suivantes :

- **Par email** : [dpo@cursus.app] (canal recommandé)
- **Par courrier postal** : DPO Cursus, [adresse à compléter]
- **Depuis votre espace personnel** pour les opérations self-service (téléchargement, rectification, suppression de compte)

### 8.2. Pièces justificatives

Afin de vérifier votre identité et éviter toute usurpation, nous pouvons vous demander une preuve d'identité (copie d'une pièce d'identité, oblitérée et limitée aux informations strictement nécessaires).

### 8.3. Délai de réponse

Nous nous engageons à répondre à votre demande dans un délai d'**un (1) mois maximum** à compter de la réception (article 12.3 RGPD). Ce délai peut être prolongé de deux mois en cas de demande complexe, auquel cas vous serez informé de la prolongation et de ses motifs.

### 8.4. Gratuité

L'exercice de vos droits est **gratuit**, sauf demande manifestement infondée ou excessive (notamment caractère répétitif).

---

## 9. Cookies et traceurs

### 9.1. Approche

Cursus adopte une approche minimaliste en matière de cookies et traceurs. Au MVP, **seuls les cookies strictement nécessaires** au fonctionnement du Service sont utilisés, sans nécessité de consentement.

### 9.2. Cookies utilisés

| Cookie             | Type                   | Finalité                           | Durée    | Consentement                        |
| ------------------ | ---------------------- | ---------------------------------- | -------- | ----------------------------------- |
| `sb-access-token`  | Strictement nécessaire | Authentification Supabase          | Session  | Non requis                          |
| `sb-refresh-token` | Strictement nécessaire | Renouvellement de session          | 30 jours | Non requis                          |
| `cursus-theme`     | Confort                | Mémoriser la préférence dark/light | 1 an     | Non requis (préférence utilisateur) |
| `cursus-lang`      | Confort                | Mémoriser la langue                | 1 an     | Non requis (préférence utilisateur) |

### 9.3. Analytics privacy-friendly

Pour l'analyse d'usage, nous utilisons **PostHog en mode privacy-friendly** :

- Pas de cookie tiers
- Identifiant pseudonyme généré côté client (localStorage)
- IP anonymisée
- Hébergement en région UE
- Pas de partage de données avec des tiers à des fins publicitaires

Cet usage ne nécessite pas de consentement au sens de l'article 82 de la Loi Informatique et Libertés tel qu'interprété par la CNIL dans sa recommandation cookies, dans la mesure où il s'agit de mesure d'audience strictement nécessaire à la fourniture du Service et où les conditions de la délibération CNIL n° 2020-091 sont respectées.

> Si nous devions ajouter des cookies non nécessaires (publicité, tracking tiers), nous mettrions en place un bandeau de consentement conforme.

### 9.4. Gestion des cookies

Vous pouvez configurer votre navigateur pour bloquer ou supprimer les cookies à tout moment. Notez que le blocage des cookies strictement nécessaires empêchera l'utilisation du Service.

---

## 10. Sécurité des données

### 10.1. Mesures techniques

Nous mettons en œuvre des mesures techniques conformes à l'état de l'art, parmi lesquelles :

- **Chiffrement en transit** : TLS 1.3 obligatoire (HSTS activé)
- **Chiffrement au repos** : base de données PostgreSQL chiffrée (AES-256), stockage objets chiffré
- **Mots de passe** : hashés avec argon2id (paramètres conformes OWASP)
- **2FA TOTP** : disponible pour tous, obligatoire pour Formateurs et Admin
- **RLS (Row-Level Security)** : isolation stricte des données entre Cohortes au niveau base de données
- **Audit logs** : traçabilité des actions sensibles (création/suppression compte, émission certificat, modification cursus)
- **Secrets management** : variables d'environnement chiffrées, rotation périodique
- **Rate limiting** : protection contre les attaques par force brute (Upstash Redis)
- **CSP, CSRF, XSS** : en-têtes de sécurité conformes OWASP
- **Dépendances** : monitoring automatique des vulnérabilités (Dependabot, audit npm)

### 10.2. Mesures organisationnelles

- Accès aux données strictement limité par rôle (principe du moindre privilège)
- Personnel formé à la protection des données et à la cybersécurité
- Engagements de confidentialité signés par tous les intervenants
- Sous-traitants liés par des DPA (Data Processing Agreements)
- Politique de gestion des incidents documentée

### 10.3. Notification de violation

En cas de violation de données à caractère personnel susceptible d'engendrer un risque pour les droits et libertés des personnes, nous nous engageons à :

- Notifier la CNIL dans un délai de **72 heures** (article 33 RGPD)
- Informer les personnes concernées **dans les meilleurs délais** lorsque la violation est susceptible d'engendrer un risque élevé (article 34 RGPD)

---

## 11. Réclamation auprès de la CNIL

Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :

- **Site web** : [https://www.cnil.fr/fr/plaintes](https://www.cnil.fr/fr/plaintes)
- **Adresse postale** : CNIL, 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07
- **Téléphone** : +33 (0)1 53 73 22 22

Vous pouvez également vous adresser à l'autorité de contrôle de votre pays de résidence dans l'UE.

---

## 12. Mise à jour de la politique

### 12.1. Évolution

La présente Politique peut être amenée à évoluer pour les motifs suivants :

- Évolution des fonctionnalités du Service
- Changement de sous-traitant
- Évolution législative ou réglementaire
- Recommandations des autorités (CNIL, EDPB)
- Améliorations rédactionnelles ou de clarté

### 12.2. Notification

Les modifications **substantielles** (nouveau traitement, nouveau sous-traitant hors UE, nouvelle finalité, modification des bases légales) sont notifiées aux Utilisateurs :

- Par email, au moins **30 jours** avant entrée en vigueur
- Par une bannière dans l'interface

Les modifications **mineures** (corrections, clarifications) sont publiées sans notification préalable mais font l'objet d'une mise à jour de la date en tête du document.

### 12.3. Historique

Un historique des versions antérieures est disponible sur demande à [dpo@cursus.app].

---

## 13. Contact

Pour toute question relative à la présente Politique ou au traitement de vos données :

- **DPO** : [dpo@cursus.app]
- **Adresse postale** : [À COMPLÉTER]
- **Page d'information** : [https://cursus.app/privacy]

---

_Fin de la Politique de Confidentialité — version 1.0_
