# Cursus Cybersec L1 — Découverte de la sécurité informatique par la pratique

> **Cursus pilote Cursus** — Première itération du catalogue. Conçu pour la cohorte pilote de 3-5 stagiaires (cf. `docs/product/06-mvp-pilote.md`). Toutes les ressources sont libres de droit et accessibles sans inscription payante (cf. `docs/product/13-ressources-externes.md`).

---

## Métadonnées

| Champ                 | Valeur                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| **Code cursus**       | `CYBERSEC-L1`                                                                                       |
| **Durée**             | 8 semaines hebdomadaires + 2 semaines de capstone                                                   |
| **Niveau**            | L1 (junior, 1ère année info)                                                                        |
| **Prérequis**         | Bases HTML/JS, git initiation, terminal Linux niveau "je sais lister un dossier"                    |
| **Charge horaire**    | ~12h/semaine (8h ressources + 4h livrable)                                                          |
| **Stack pédagogique** | Ressources externes libres (nodeschool, OWASP, TryHackMe gratuit, PortSwigger Academy gratuit, MDN) |
| **Validation**        | Harnais Cursus (GitHub Actions) à chaque livrable hebdomadaire + quiz de check-in                   |
| **Capstone**          | Mini-audit de sécurité d'une cible légale (HackTheBox starting point / TryHackMe room dédiée)       |
| **Soutenance**        | Orale, 30 minutes (20 min présentation + 10 min Q&A)                                                |
| **Format**            | 100% distanciel, asynchrone, avec 1 standup hebdo de 30 min en visio                                |

---

## Objectifs pédagogiques (sortie de cursus)

À la fin du cursus, le stagiaire est capable de :

1. **Naviguer en autonomie dans un terminal Linux** et automatiser des tâches simples avec bash et git (clone, branch, rebase, signed commits).
2. **Expliquer et reconnaître les 10 vulnérabilités OWASP** sur des exemples concrets, et démontrer au moins 3 d'entre elles dans un environnement contrôlé (lab fourni).
3. **Conduire une phase de reconnaissance** (passive et active) sur une cible légale en utilisant whois, dig, nmap, dirb et Burp Suite Community.
4. **Comprendre les fondamentaux cryptographiques** (hash, symétrique, asymétrique, TLS) et utiliser les outils standards (openssl, age, gpg).
5. **Mettre en place les défenses de base d'une application web** (headers HTTP de sécurité, CSP, gestion des logs, détection d'intrusion basique).
6. **Produire un rapport d'audit de sécurité professionnel** classant les vulnérabilités par sévérité CVSS et proposant des remédiations actionnables.

---

## Vue d'ensemble des 8 semaines

| Sem  | Titre                                                 | Charge | Livrable principal                                                   | Badge               |
| ---- | ----------------------------------------------------- | :----: | -------------------------------------------------------------------- | ------------------- |
| 1    | Terminal Linux + Git workflow                         |  12h   | Repo `cybersec-l1-w1-toolbox` + complétion `git-it` + `learnyoubash` | `terminal-jedi`     |
| 2    | Hygiène numérique + HTTP/Web fundamentals             |  12h   | Audit perso 2FA + cheatsheet HTTP commenté                           | `safe-citizen`      |
| 3    | OWASP Top 10 — Partie 1 (Injection, XSS, BAC)         |  13h   | 3 démos exploitées en lab DVWA + writeup                             | `owasp-rookie`      |
| 4    | OWASP Top 10 — Partie 2 (CSRF, SSRF, IDOR, Misconfig) |  13h   | 4 labs PortSwigger résolus + writeup                                 | `owasp-warrior`     |
| 5    | Recon passive (OSINT, whois, DNS)                     |  11h   | Dossier OSINT sur cible fournie + script auto                        | `silent-watcher`    |
| 6    | Recon active (nmap, dirb, Burp Suite)                 |  13h   | Scan complet d'une room TryHackMe + rapport                          | `active-scout`      |
| 7    | Crypto fondamentaux                                   |  12h   | TP openssl + age + signatures GPG des commits                        | `cipher-apprentice` |
| 8    | Défense (headers, CSP, logs, IDS)                     |  12h   | Hardening d'une app Express fournie + tests                          | `blue-defender`     |
| 9-10 | **Capstone** : audit complet                          | 25-30h | Repo audit + rapport PDF + soutenance                                | `pentester-l1`      |

---

## Semaine 1 — Terminal Linux et Git workflow

### Objectifs

1. Manipuler un terminal Linux pour naviguer, lire, écrire et chaîner des commandes (pipe, redirections).
2. Maîtriser le workflow Git collaboratif : clone, branch, commit signés, rebase, pull request.
3. Documenter son travail en Markdown propre et reproductible.

### Ressources (libres de droits)

| Ressource                                                                                                         | Type                    |   Durée    | Pourquoi                                                     |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------- | :--------: | ------------------------------------------------------------ |
| [learnyoubash](https://github.com/denysdovhan/learnyoubash) (nodeschool)                                          | Atelier CLI interactif  |     3h     | Bash par la pratique, auto-validé localement                 |
| [git-it](https://github.com/jlord/git-it-electron) (nodeschool)                                                   | App desktop interactive |     2h     | 12 challenges Git progressifs, idéal pour ancrer le workflow |
| [Pro Git book — Chapitres 1-3](https://git-scm.com/book/fr/v2)                                                    | Livre référence (FR)    | 2h lecture | Vocabulaire et concepts Git canoniques                       |
| [Learn Git Branching](https://learngitbranching.js.org/?locale=fr_FR)                                             | Tuto visuel interactif  |    1h30    | Visualiser rebase/merge — débloque les confusions            |
| [how-to-markdown](https://github.com/workshopper/how-to-markdown) (nodeschool)                                    | Atelier CLI             |     1h     | Markdown propre dès le départ                                |
| [GitHub Docs — Signing commits](https://docs.github.com/en/authentication/managing-commit-signature-verification) | Documentation           |   30 min   | Configurer GPG ou SSH signing                                |

### Livrable

Créer un repo GitHub **public** nommé `cybersec-l1-w1-toolbox` avec la structure suivante :

```
cybersec-l1-w1-toolbox/
├── README.md                     # Présentation + table des matières
├── completion/
│   ├── learnyoubash.png          # Capture fin atelier (12/12 challenges)
│   └── git-it.png                # Capture fin atelier (12/12 challenges)
├── exercises/
│   ├── 01-pipe-grep.sh           # Script qui compte les fichiers .log dans /var/log par jour
│   ├── 02-rebase-demo/           # Repo Git avec 3 commits + un rebase visible dans le reflog
│   └── 03-ssh-keygen.md          # Documentation pas-à-pas de la génération de clé SSH
└── RESUME.md                     # 10 phrases : ce que tu as appris + ce qui était dur
```

**Tous les commits doivent être signés** (GPG ou SSH). Le harnais vérifie la présence du symbole "Verified".

### Critères harnais (auto-validation)

```yaml
checks:
  - id: repo_exists_public
    params: { name: 'cybersec-l1-w1-toolbox' }
  - id: file_exists
    params: { path: 'README.md', min_size_bytes: 500 }
  - id: file_exists
    params: { path: 'completion/learnyoubash.png', mime: 'image/png' }
  - id: file_exists
    params: { path: 'completion/git-it.png', mime: 'image/png' }
  - id: file_exists
    params: { path: 'exercises/01-pipe-grep.sh', min_size_bytes: 50 }
  - id: file_exists
    params: { path: 'exercises/03-ssh-keygen.md', min_size_bytes: 300 }
  - id: file_exists
    params: { path: 'RESUME.md', min_lines: 10 }
  - id: commits_signed
    params: { min_signed_commits: 5, ratio_min: 1.0 }
  - id: branch_exists
    params: { name: 'main' }
```

### Quiz check-in (5 questions)

1. **QCM** — Quelle commande affiche les 20 dernières lignes d'un fichier `access.log` ?
   - a) `head -n 20 access.log`
   - b) **`tail -n 20 access.log`** ✅
   - c) `grep -n 20 access.log`
   - d) `cat -20 access.log`
   - _Explication_ : `tail -n N` extrait les N dernières lignes. `head` fait l'inverse.

2. **QCM** — Que fait la commande `git rebase -i HEAD~3` ?
   - a) Annule les 3 derniers commits définitivement
   - b) **Ouvre un éditeur pour réorganiser/squash/edit les 3 derniers commits** ✅
   - c) Crée 3 nouvelles branches
   - d) Pousse les 3 commits vers la remote
   - _Explication_ : `rebase -i` (interactif) permet de réécrire l'historique local. Ne jamais l'utiliser sur des commits déjà publiés et partagés.

3. **Texte court** — Quelle différence entre `git merge` et `git rebase` (en une phrase) ?
   - _Réponse attendue_ : `merge` crée un nouveau commit de fusion préservant l'historique des deux branches ; `rebase` réapplique les commits d'une branche au sommet d'une autre, donnant un historique linéaire.

4. **QCM** — Pourquoi signer ses commits Git ?
   - a) Pour qu'ils soient acceptés par GitHub
   - b) **Pour prouver cryptographiquement l'identité de l'auteur** ✅
   - c) Pour les chiffrer
   - d) Pour les rendre privés
   - _Explication_ : la signature ne chiffre rien — elle prouve que c'est bien toi qui as fait le commit (anti-impersonation). GitHub affiche un badge "Verified".

5. **QCM** — Que retourne la commande `cat /etc/passwd | grep -v nologin | wc -l` ?
   - a) Le nombre total d'utilisateurs du système
   - b) **Le nombre d'utilisateurs ayant un shell interactif** ✅
   - c) La liste des shells installés
   - d) Une erreur
   - _Explication_ : on lit `/etc/passwd`, on retire (`-v`) les lignes contenant `nologin`, on compte (`wc -l`). Bel exemple de pipe.

### Badge associé

- **`terminal-jedi`** — Débloqué quand le livrable W1 est validé par le harnais ET le quiz est passé avec ≥4/5.

### Temps estimé

- Ressources : 8h
- Livrable : 3h
- Quiz : 30 min
- **Total : ~11h30**

---

## Semaine 2 — Hygiène numérique et fondamentaux HTTP/Web

### Objectifs

1. Comprendre les attaques les plus courantes sur l'utilisateur final (phishing, credential stuffing, vol de session) et appliquer les contre-mesures.
2. Maîtriser le modèle HTTP (méthodes, statuts, headers, cookies) et savoir lire un échange dans les DevTools du navigateur.
3. Mettre en place 2FA TOTP sur tous ses comptes critiques et utiliser un gestionnaire de mots de passe.

### Ressources (libres de droits)

| Ressource                                                                                                            | Type          | Durée  | Pourquoi                                             |
| -------------------------------------------------------------------------------------------------------------------- | ------------- | :----: | ---------------------------------------------------- |
| [MDN — Aperçu HTTP](https://developer.mozilla.org/fr/docs/Web/HTTP/Overview)                                         | Documentation |   1h   | Le canonique francophone sur HTTP                    |
| [MDN — HTTP Headers](https://developer.mozilla.org/fr/docs/Web/HTTP/Headers)                                         | Documentation |   1h   | Référence des headers — survol obligatoire           |
| [web.dev — Learn Authentication](https://web.dev/learn/) (sections sécurité)                                         | Cours         |  1h30  | Concepts clairs sur cookies, sessions, JWT           |
| [ANSSI — Guide d'hygiène informatique](https://www.ssi.gouv.fr/uploads/2017/01/guide_hygiene_informatique_anssi.pdf) | PDF officiel  |   2h   | Référence francophone officielle, 42 règles          |
| [Bitwarden — Documentation](https://bitwarden.com/help/)                                                             | Doc produit   | 30 min | Gestionnaire de mots de passe open-source recommandé |
| [haveibeenpwned.com](https://haveibeenpwned.com/)                                                                    | Outil         | 15 min | Vérifier ses fuites                                  |
| [Krebs on Security — How to use 2FA](https://krebsonsecurity.com/tag/two-factor-authentication/)                     | Articles      |   1h   | Pourquoi le SMS 2FA est faible, pourquoi TOTP gagne  |

### Livrable

Repo public `cybersec-l1-w2-hygiene-http` avec :

```
cybersec-l1-w2-hygiene-http/
├── README.md
├── audit-personnel/
│   ├── README.md                 # Audit perso (anonymisé) : services, types de 2FA, exposition
│   ├── inventaire.md             # Tableau : service / type 2FA / présent dans HIBP (oui/non) / action
│   └── plan-hardening.md         # Plan d'action 30 jours pour upgrader son hygiène
├── http-cheatsheet/
│   ├── README.md
│   ├── 01-methodes.md            # GET/POST/PUT/PATCH/DELETE — quand utiliser quoi
│   ├── 02-codes-statut.md        # 2xx/3xx/4xx/5xx avec exemples
│   ├── 03-headers-essentiels.md  # Auth, Cookie, CORS, Cache, Content-Security-Policy
│   └── 04-cookies-sessions.md    # Cookies, SameSite, HttpOnly, Secure
├── pratique/
│   ├── 01-curl-exercices.sh      # 10 requêtes curl variées (GET, POST JSON, headers, auth)
│   └── 02-devtools-capture.png   # Capture DevTools d'une requête analysée + annotations
└── RESUME.md
```

**Note** : pour `audit-personnel`, le stagiaire n'écrit **jamais** ses mots de passe ou comptes nominatifs. Il documente la méthode et le résultat agrégé (ex : "8 comptes / 3 avec 2FA TOTP / 2 avec SMS / 3 sans 2FA").

### Critères harnais

```yaml
checks:
  - id: repo_exists_public
    params: { name: 'cybersec-l1-w2-hygiene-http' }
  - id: file_exists
    params: { path: 'audit-personnel/inventaire.md', min_lines: 15 }
  - id: file_exists
    params: { path: 'audit-personnel/plan-hardening.md', min_lines: 10 }
  - id: file_exists
    params: { path: 'http-cheatsheet/01-methodes.md', min_size_bytes: 800 }
  - id: file_exists
    params: { path: 'http-cheatsheet/02-codes-statut.md', min_size_bytes: 800 }
  - id: file_exists
    params: { path: 'http-cheatsheet/03-headers-essentiels.md', min_size_bytes: 1000 }
  - id: file_exists
    params: { path: 'pratique/01-curl-exercices.sh', min_size_bytes: 300 }
  - id: file_exists
    params: { path: 'pratique/02-devtools-capture.png', mime: 'image/png' }
  - id: commits_signed
    params: { ratio_min: 1.0 }
```

### Quiz check-in (5 questions)

1. **QCM** — Quelle est la différence entre une attaque de phishing et une attaque de credential stuffing ?
   - a) Aucune, c'est la même chose
   - b) **Le phishing trompe l'utilisateur pour qu'il livre ses identifiants ; le credential stuffing réutilise des couples email/mdp fuités d'un service A pour les tester sur un service B** ✅
   - c) Le phishing utilise SMS, le credential stuffing utilise email
   - d) Les deux sont des attaques sur le serveur uniquement
   - _Explication_ : le phishing exploite l'humain (UI trompeuse), le credential stuffing exploite la réutilisation de mots de passe entre services.

2. **QCM** — Quel header HTTP empêche un cookie d'être envoyé lors de requêtes cross-site initiées par JavaScript tiers ?
   - a) `Secure`
   - b) `HttpOnly`
   - c) **`SameSite=Lax` (ou `Strict`)** ✅
   - d) `Domain=*`
   - _Explication_ : `SameSite` est la défense de premier rang contre CSRF. `HttpOnly` empêche l'accès JS au cookie (anti-XSS-vol-de-session). `Secure` impose HTTPS.

3. **Texte court** — Cite 3 raisons pour lesquelles SMS 2FA est plus faible que TOTP.
   - _Réponse attendue_ (≥2 sur 3) : SIM swap, interception SS7, pas de chiffrement bout-en-bout, dépendance opérateur, hameçonnage en temps réel facile via faux opérateur.

4. **QCM** — Un serveur répond `301 Moved Permanently` avec `Location: https://example.com`. Que doit faire le navigateur ?
   - a) Afficher la page courante telle quelle
   - b) **Suivre la redirection vers la nouvelle URL et mémoriser que c'est permanent** ✅
   - c) Afficher une erreur 404
   - d) Refaire la requête en POST
   - _Explication_ : 301 = redirection permanente, le navigateur (et les moteurs de recherche) mettent à jour leur cache d'URL. 302 = temporaire.

5. **QCM** — Pourquoi un mot de passe long mais simple (`correctchevalbatteriepile`) est-il en pratique plus fort qu'un mot court complexe (`P@ssw0rd!`) ?
   - a) Parce qu'il contient plus de caractères ASCII
   - b) **Parce que l'entropie augmente exponentiellement avec la longueur, alors que la complexité de caractères ajoute peu** ✅
   - c) Parce que les outils de bruteforce ne testent pas les phrases
   - d) Parce qu'il est plus facile à mémoriser
   - _Explication_ : c'est le classique XKCD 936. L'entropie d'une phrase de 4 mots aléatoires d'un dictionnaire de 2048 mots ≈ 44 bits, vs ~28 bits pour `P@ssw0rd!`.

### Badge associé

- **`safe-citizen`** — Débloqué quand le livrable W2 est validé ET quiz ≥4/5. Symbolise la maîtrise de l'hygiène numérique personnelle.

### Temps estimé

- Ressources : 7h
- Livrable : 4h
- Quiz : 30 min
- **Total : ~11h30**

---

## Semaine 3 — OWASP Top 10 — Partie 1 (Injection, XSS, Broken Access Control)

### Objectifs

1. Comprendre les 3 vulnérabilités web les plus courantes : SQL injection, XSS (reflected/stored/DOM), broken access control.
2. Exploiter chacune dans un environnement de lab légal (DVWA local ou OWASP Juice Shop).
3. Rédiger un writeup professionnel d'une exploitation : contexte, payload, impact, remédiation.

### Ressources (libres de droits)

| Ressource                                                                                               | Type                     |     Durée      | Pourquoi                                                  |
| ------------------------------------------------------------------------------------------------------- | ------------------------ | :------------: | --------------------------------------------------------- |
| [OWASP Top 10 — A01 Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)     | Référence canonique      |       1h       | Source officielle, exemples concrets                      |
| [OWASP Top 10 — A03 Injection](https://owasp.org/Top10/A03_2021-Injection/)                             | Référence canonique      |       1h       | Source officielle                                         |
| [PortSwigger Academy — SQL Injection](https://portswigger.net/web-security/sql-injection)               | Cours interactif gratuit |       3h       | Le meilleur cours web sec gratuit, labs intégrés          |
| [PortSwigger Academy — Cross-site scripting](https://portswigger.net/web-security/cross-site-scripting) | Cours interactif gratuit |       3h       | Idem, labs gratuits                                       |
| [PortSwigger Academy — Access Control](https://portswigger.net/web-security/access-control)             | Cours interactif gratuit |       2h       | IDOR, élévation de privilèges                             |
| [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/)                                           | Application de lab       | install 30 min | Webapp volontairement vulnérable, on l'attaque légalement |
| [DVWA — Damn Vulnerable Web App](https://github.com/digininja/DVWA)                                     | App de lab               | install 30 min | Alternative à Juice Shop, modes de difficulté gradués     |

> **Important légalité** : ne jamais exploiter ces vulnérabilités sur des cibles que tu ne possèdes pas ou pour lesquelles tu n'as pas d'autorisation écrite. Toutes les manipulations se font **uniquement** dans le lab local (Juice Shop / DVWA) ou sur PortSwigger Academy (qui fournit ses propres environnements).

### Livrable

Repo public `cybersec-l1-w3-owasp-part1` avec :

```
cybersec-l1-w3-owasp-part1/
├── README.md                     # Description + table des matières + disclaimer légal
├── setup/
│   ├── juice-shop-install.md     # Docker run + URL locale + version
│   └── docker-compose.yml        # Optionnel mais propre
├── writeups/
│   ├── 01-sql-injection/
│   │   ├── README.md             # Contexte / payload / impact CVSS / remédiation
│   │   ├── capture-1.png         # Avant injection
│   │   ├── capture-2.png         # Pendant injection
│   │   └── capture-3.png         # Données extraites (anonymisées)
│   ├── 02-xss-stored/
│   │   ├── README.md             # Idem structure
│   │   └── captures/
│   └── 03-broken-access-control/
│       ├── README.md
│       └── captures/
├── lab-labs-portswigger/
│   └── completed.md              # Liste des labs PortSwigger validés avec date + URL
└── RESUME.md
```

Chaque writeup doit contenir au moins :

- **Contexte** : où sur l'app, page/endpoint
- **Payload** : code exact utilisé
- **Étapes** : reproduction pas-à-pas
- **Impact** : note CVSS estimée + données accessibles
- **Remédiation** : 3 actions concrètes côté dev

### Critères harnais

```yaml
checks:
  - id: repo_exists_public
    params: { name: 'cybersec-l1-w3-owasp-part1' }
  - id: file_exists
    params: { path: 'writeups/01-sql-injection/README.md', min_lines: 30 }
  - id: file_exists
    params: { path: 'writeups/02-xss-stored/README.md', min_lines: 30 }
  - id: file_exists
    params: { path: 'writeups/03-broken-access-control/README.md', min_lines: 30 }
  - id: file_exists
    params: { path: 'writeups/01-sql-injection/capture-1.png', mime: 'image/png' }
  - id: file_exists
    params: { path: 'writeups/02-xss-stored/captures', is_directory: true, min_files: 2 }
  - id: file_exists
    params: { path: 'writeups/03-broken-access-control/captures', is_directory: true, min_files: 2 }
  - id: file_exists
    params: { path: 'lab-labs-portswigger/completed.md', min_lines: 5 }
  - id: file_contains
    params: { path: 'README.md', pattern: '(?i)disclaimer|lab local|environnement contrôlé' }
  - id: commits_signed
    params: { ratio_min: 1.0 }
```

### Quiz check-in (5 questions)

1. **QCM** — Quelle est la défense de référence contre l'injection SQL ?
   - a) Échapper les caractères spéciaux avec `addslashes()`
   - b) **Utiliser des requêtes paramétrées (prepared statements)** ✅
   - c) Filtrer les mots-clés SQL dans l'input
   - d) Chiffrer la base de données
   - _Explication_ : seule la séparation entre code SQL et données (via paramètres) est robuste. L'échappement et le filtrage par blacklist sont contournables.

2. **QCM** — Une XSS _stored_ est plus dangereuse qu'une XSS _reflected_ parce que :
   - a) Elle est plus rapide à exécuter
   - b) **Elle est servie automatiquement à tous les utilisateurs qui visitent la page contenant le payload** ✅
   - c) Elle ne peut pas être bloquée par un WAF
   - d) Elle fonctionne sans JavaScript
   - _Explication_ : stored = payload persisté en base, déclenché à chaque affichage. Reflected = payload dans l'URL, nécessite que la victime clique sur un lien malveillant.

3. **Texte court** — Qu'est-ce qu'un IDOR (Insecure Direct Object Reference) ?
   - _Réponse attendue_ : faille où l'application expose une référence directe à un objet (ex : `/api/users/1234`) sans vérifier que l'utilisateur authentifié a le droit d'y accéder. En changeant `1234` en `1235` on accède aux données d'un autre user.

4. **QCM** — Quelle directive Content-Security-Policy bloque l'exécution de scripts inline (donc atténue beaucoup d'XSS) ?
   - a) `default-src 'self'`
   - b) **`script-src 'self'` (sans `'unsafe-inline'`)** ✅
   - c) `frame-ancestors 'none'`
   - d) `report-uri /csp`
   - _Explication_ : sans `'unsafe-inline'`, les `<script>` directement dans le HTML et les `onclick=` ne s'exécutent plus. C'est une défense en profondeur efficace contre XSS reflected.

5. **QCM** — Tu trouves cette URL après un login : `/profile?user_id=42`. Tu changes en `user_id=43` et tu vois les infos d'un autre utilisateur. C'est :
   - a) Une XSS
   - b) Une SQL injection
   - c) **Un Broken Access Control / IDOR** ✅
   - d) Un CSRF
   - _Explication_ : l'app fait confiance au paramètre client sans vérifier l'autorisation côté serveur. Remédiation : la session devrait dicter `user_id`, ou un check `if (current_user.id !== requested_id) → 403`.

### Badge associé

- **`owasp-rookie`** — Débloqué quand le livrable W3 est validé ET quiz ≥4/5.

### Temps estimé

- Ressources : 9h
- Livrable : 4h
- Quiz : 30 min
- **Total : ~13h30**

---

## Semaine 4 — OWASP Top 10 — Partie 2 (CSRF, SSRF, Misconfig, Crypto failures)

### Objectifs

1. Comprendre les vulnérabilités plus subtiles : CSRF, SSRF, security misconfiguration, cryptographic failures, vulnerable components.
2. Résoudre des labs interactifs sur PortSwigger Academy.
3. Construire un mini-checklist de hardening applicatif réutilisable.

### Ressources (libres de droits)

| Ressource                                                                                                        | Type               | Durée  | Pourquoi                                              |
| ---------------------------------------------------------------------------------------------------------------- | ------------------ | :----: | ----------------------------------------------------- |
| [OWASP Top 10 — A02 Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)            | Référence          | 45 min | Pourquoi un mauvais TLS ou un mauvais hash = fail     |
| [OWASP Top 10 — A05 Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)      | Référence          | 45 min | Headers manquants, defaults dangereux, verbose errors |
| [OWASP Top 10 — A06 Vulnerable Components](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/) | Référence          | 30 min | Importance des mises à jour de dépendances            |
| [PortSwigger Academy — CSRF](https://portswigger.net/web-security/csrf)                                          | Cours + labs       |   2h   | Idem qualité que W3                                   |
| [PortSwigger Academy — SSRF](https://portswigger.net/web-security/ssrf)                                          | Cours + labs       |  2h30  | SSRF = vecteur clé pour les attaques cloud            |
| [Snyk Vulnerability DB](https://security.snyk.io/)                                                               | Base CVE           | 30 min | S'habituer à chercher un CVE par package              |
| [Mozilla Observatory](https://observatory.mozilla.org/)                                                          | Outil scan headers | 30 min | Scanner gratuit qui note la conf headers d'un site    |

### Livrable

Repo public `cybersec-l1-w4-owasp-part2` avec :

```
cybersec-l1-w4-owasp-part2/
├── README.md
├── writeups/
│   ├── 01-csrf/README.md
│   ├── 02-ssrf/README.md
│   ├── 03-misconfig-headers/
│   │   ├── README.md
│   │   ├── observatory-before.png    # Capture d'un site qui te concerne (le tien ou un fictif)
│   │   └── observatory-after.png     # Après hardening (sur un site fictif setup en local)
│   └── 04-vulnerable-deps/
│       ├── README.md                 # Démarche : `npm audit` sur projet test, analyse 3 CVE
│       └── npm-audit.txt
├── checklist-hardening/
│   ├── README.md
│   ├── headers.md                    # Liste headers HTTP avec valeurs recommandées
│   ├── tls.md                        # Ciphers, versions, HSTS
│   └── deps.md                       # Comment auditer ses deps en CI
├── labs-portswigger/
│   └── completed.md                  # ≥4 labs validés sur les 4 thèmes
└── RESUME.md
```

### Critères harnais

```yaml
checks:
  - id: repo_exists_public
    params: { name: 'cybersec-l1-w4-owasp-part2' }
  - id: file_exists
    params: { path: 'writeups/01-csrf/README.md', min_lines: 25 }
  - id: file_exists
    params: { path: 'writeups/02-ssrf/README.md', min_lines: 25 }
  - id: file_exists
    params: { path: 'writeups/03-misconfig-headers/README.md', min_lines: 20 }
  - id: file_exists
    params: { path: 'writeups/03-misconfig-headers/observatory-before.png', mime: 'image/png' }
  - id: file_exists
    params: { path: 'writeups/03-misconfig-headers/observatory-after.png', mime: 'image/png' }
  - id: file_exists
    params: { path: 'writeups/04-vulnerable-deps/npm-audit.txt', min_size_bytes: 100 }
  - id: file_exists
    params: { path: 'checklist-hardening/headers.md', min_lines: 15 }
  - id: file_exists
    params: { path: 'checklist-hardening/tls.md', min_lines: 10 }
  - id: file_exists
    params: { path: 'labs-portswigger/completed.md', min_lines: 4 }
  - id: commits_signed
    params: { ratio_min: 1.0 }
```

### Quiz check-in (5 questions)

1. **QCM** — Quelle est la défense la plus simple et la plus efficace contre CSRF dans un formulaire moderne ?
   - a) Reverse proxy
   - b) Hash du mot de passe en SHA-256
   - c) **Token CSRF aléatoire vérifié côté serveur + cookie `SameSite=Lax`** ✅
   - d) Captcha sur chaque page
   - _Explication_ : la combinaison token CSRF + SameSite est la pratique recommandée. Captcha = friction inutile pour la plupart des actions.

2. **QCM** — Une SSRF permet à un attaquant :
   - a) D'injecter du JS dans le navigateur de la victime
   - b) **De faire faire des requêtes au serveur cible vers des URLs internes (ex : metadata cloud `169.254.169.254`)** ✅
   - c) D'écrire en base de données
   - d) De voler les cookies de l'utilisateur
   - _Explication_ : SSRF = on force le serveur à émettre une requête. C'est dévastateur en cloud (IMDS AWS/GCP/Azure) car le serveur a souvent des credentials cloud.

3. **Texte court** — Cite 3 headers HTTP de sécurité essentiels en 2026.
   - _Réponse attendue (≥2 sur 3)_ : `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.

4. **QCM** — Une dépendance npm a un CVE de sévérité Critical. Quelle est la première action ?
   - a) Désactiver `npm audit`
   - b) **Vérifier si une version patchée existe et l'installer, puis re-tester** ✅
   - c) Forker la dépendance et patcher soi-même
   - d) Migrer vers une alternative immédiatement
   - _Explication_ : 99% du temps, une version patch existe. Si non, alors évaluer une alternative ou patcher.

5. **QCM** — Pourquoi MD5 ne doit-il plus être utilisé pour hasher des mots de passe ?
   - a) Il est trop lent
   - b) Il ne supporte pas l'UTF-8
   - c) **Il est rapide et vulnérable aux collisions ; un attaquant peut bruteforcer des milliards de hash/sec sur GPU** ✅
   - d) Il est interdit par la RGPD
   - _Explication_ : pour les mots de passe, on utilise des fonctions lentes et adaptatives : Argon2id (recommandé), scrypt, bcrypt.

### Badge associé

- **`owasp-warrior`** — Débloqué après livrable W4 validé ET quiz ≥4/5. Cumul `owasp-rookie + owasp-warrior` = compétence "OWASP Top 10 maîtrisé sur le plan théorique et pratique".

### Temps estimé

- Ressources : 7h
- Livrable : 5h
- Quiz : 30 min
- **Total : ~12h30**

---

## Semaine 5 — Reconnaissance passive (OSINT, whois, DNS)

### Objectifs

1. Conduire une phase de reconnaissance **passive** (sans toucher la cible) sur une organisation.
2. Maîtriser les outils standards : `whois`, `dig`, `subfinder`, recherche Google avancée (dorks), recherche dans des bases publiques (Shodan free tier, crt.sh).
3. Documenter ses trouvailles dans un dossier d'OSINT professionnel.

### Ressources (libres de droits)

| Ressource                                                                                                                                          | Type                   | Durée  | Pourquoi                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | :----: | -------------------------------------------------------------------- |
| [TryHackMe — OSINT room (gratuite)](https://tryhackme.com/room/redteamrecon)                                                                       | Lab interactif gratuit |   2h   | Premier contact pratique                                             |
| [OSINT Framework](https://osintframework.com/)                                                                                                     | Catalogue d'outils     |   1h   | La map mentale OSINT — bookmarker obligatoirement                    |
| [Bellingcat — Online Investigation Toolkit](https://docs.google.com/document/d/1BfLPJpRtyq4RFtHJoNpvWQjmGnyVkfE2HYoICKOGguA)                       | Référence              |   1h   | Outils utilisés par les journalistes d'investigation                 |
| [crt.sh](https://crt.sh/)                                                                                                                          | Outil web              | 30 min | Liste tous les certificats TLS d'un domaine = sous-domaines en clair |
| [Shodan — Getting Started](https://help.shodan.io/)                                                                                                | Doc                    | 30 min | "Google des objets exposés sur Internet"                             |
| [Google Dorks Cheat Sheet — Exploit-DB](https://www.exploit-db.com/google-hacking-database)                                                        | Cheatsheet             | 30 min | Opérateurs avancés pour Google                                       |
| [dig manpage + tutoriel DigitalOcean](https://www.digitalocean.com/community/tutorials/an-introduction-to-dns-terminology-components-and-concepts) | Doc + tuto             |   2h   | Comprendre A, AAAA, MX, TXT, NS, CNAME                               |

### Livrable

Repo public `cybersec-l1-w5-recon-passive`.

**Cible imposée pour ce livrable** : un domaine _exemple_ fourni par le formateur (typiquement un domaine "vulnerable by design" comme `testfire.net` ou un domaine de challenge légal — confirmation Mohamed avant lancement de la semaine).

```
cybersec-l1-w5-recon-passive/
├── README.md
├── methodologie.md               # Le process suivi, ordre des outils
├── dossier-osint/
│   ├── 01-whois.md               # Données whois (registrar, dates, contacts publics)
│   ├── 02-dns-records.md         # Tous les records DNS (A, MX, TXT, NS) + interprétation
│   ├── 03-subdomaines.md         # Liste des sous-domaines via crt.sh + interprétation
│   ├── 04-tech-stack.md          # Stack technique déduite (headers, builtwith.com, wappalyzer)
│   ├── 05-google-dorks.md        # 5 dorks utilisés + ce qu'ils ont révélé
│   └── 06-synthese.md            # Surface d'attaque synthétisée + recommandations
├── scripts/
│   └── recon-auto.sh             # Script bash qui automatise whois + dig + crt.sh pour un domaine donné
└── RESUME.md
```

> **Légalité** : aucune des actions ne touche le serveur (passive only). Pas de scan de ports, pas de bruteforce DNS actif, pas d'envoi de requêtes anormales. Si vous doutez de la légalité d'une action → demandez avant.

### Critères harnais

```yaml
checks:
  - id: repo_exists_public
    params: { name: 'cybersec-l1-w5-recon-passive' }
  - id: file_exists
    params: { path: 'methodologie.md', min_lines: 15 }
  - id: file_exists
    params: { path: 'dossier-osint/01-whois.md', min_size_bytes: 400 }
  - id: file_exists
    params: { path: 'dossier-osint/02-dns-records.md', min_size_bytes: 400 }
  - id: file_exists
    params: { path: 'dossier-osint/03-subdomaines.md', min_size_bytes: 300 }
  - id: file_exists
    params: { path: 'dossier-osint/06-synthese.md', min_lines: 20 }
  - id: file_exists
    params: { path: 'scripts/recon-auto.sh', min_size_bytes: 200 }
  - id: file_contains
    params: { path: 'scripts/recon-auto.sh', pattern: '(?i)whois|dig' }
  - id: commits_signed
    params: { ratio_min: 1.0 }
```

### Quiz check-in (5 questions)

1. **QCM** — Quelle commande retourne les serveurs de mail d'un domaine ?
   - a) `dig example.com NS`
   - b) **`dig example.com MX`** ✅
   - c) `dig example.com A`
   - d) `whois example.com`
   - _Explication_ : MX = Mail eXchange. NS = Name Server. A = adresse IPv4.

2. **Texte court** — Pourquoi crt.sh est-il intéressant en recon passive ?
   - _Réponse attendue_ : il liste tous les certificats TLS émis pour un domaine et ses sous-domaines (logs Certificate Transparency). On découvre ainsi des sous-domaines internes (dev.example.com, staging.example.com) que l'organisation ne veut pas exposer publiquement.

3. **QCM** — Le dork Google `site:example.com filetype:pdf "confidentiel"` permet de :
   - a) Scanner les ports du domaine
   - b) **Trouver des PDF marqués "confidentiel" hébergés sur le domaine et indexés par Google** ✅
   - c) Télécharger le contenu du site
   - d) Tester si le site est en HTTPS
   - _Explication_ : les Google Dorks combinent des opérateurs (`site:`, `filetype:`, `inurl:`, `intitle:`) pour des recherches très ciblées. C'est passif (Google a déjà crawlé).

4. **QCM** — La recon passive se distingue de la recon active parce qu'elle :
   - a) Est faite avec des outils gratuits
   - b) **N'envoie aucun trafic à la cible (utilise uniquement des sources tierces)** ✅
   - c) Est plus rapide
   - d) Ne nécessite pas d'autorisation
   - _Explication_ : passive = sources tierces (Google, whois, crt.sh, Shodan). Active = on parle directement au serveur (nmap, dirb). La passive est _en général_ légale partout, l'active nécessite une autorisation.

5. **QCM** — Le record DNS `TXT v=spf1 include:_spf.google.com ~all` indique :
   - a) Que le domaine utilise Google Analytics
   - b) **Que le domaine autorise Google Mail à envoyer des mails en son nom (SPF)** ✅
   - c) Que le DNS est hébergé chez Google
   - d) Que le site est protégé par Google reCAPTCHA
   - _Explication_ : SPF est un record TXT qui liste les serveurs autorisés à émettre du mail pour un domaine. Lire un SPF révèle l'infra mail.

### Badge associé

- **`silent-watcher`** — Débloqué après livrable W5 validé. Symbolise la capacité à observer sans être détecté.

### Temps estimé

- Ressources : 6h
- Livrable : 4h
- Quiz : 30 min
- **Total : ~10h30**

---

## Semaine 6 — Reconnaissance active (nmap, dirb, Burp Suite)

### Objectifs

1. Conduire une phase de reconnaissance **active** sur une cible _légalement autorisée_ (TryHackMe room).
2. Maîtriser `nmap` (scan de ports + scripts NSE), `dirb`/`ffuf` (fuzzing de chemins), Burp Suite Community (interception et modification de requêtes).
3. Produire un rapport de surface d'attaque structuré.

### Ressources (libres de droits)

| Ressource                                                                                             | Type          |   Durée   | Pourquoi                                      |
| ----------------------------------------------------------------------------------------------------- | ------------- | :-------: | --------------------------------------------- |
| [TryHackMe — Nmap Room (gratuite)](https://tryhackme.com/room/furthernmap)                            | Lab gratuit   |    3h     | Le meilleur tuto nmap interactif gratuit      |
| [TryHackMe — Burp Suite Basics (gratuite)](https://tryhackme.com/room/burpsuitebasics)                | Lab gratuit   |    2h     | Intro à Burp Community pour HTTP interception |
| [Nmap official documentation](https://nmap.org/book/man.html)                                         | Doc référence | 1h survol | Lire la section options + scripts NSE         |
| [PortSwigger — Burp Suite documentation](https://portswigger.net/burp/documentation/desktop)          | Doc           |    1h     | Référence officielle Burp                     |
| [HackTricks — Pentesting Web](https://book.hacktricks.xyz/network-services-pentesting/pentesting-web) | Wiki          |    1h     | Cheatsheet exhaustive (en survol L1)          |
| [SecLists (GitHub)](https://github.com/danielmiessler/SecLists)                                       | Wordlists     |  30 min   | Les wordlists de référence pour fuzzing       |

### Livrable

Repo public `cybersec-l1-w6-recon-active`.

**Cible imposée** : une **room TryHackMe gratuite** spécifique (ex : `Vulnversity`, `Basic Pentesting`, `Pickle Rick` — le formateur indique laquelle au début de la semaine).

```
cybersec-l1-w6-recon-active/
├── README.md                     # + disclaimer légal (target = TryHackMe room autorisée)
├── target.md                     # Identification cible : URL TryHackMe, IP virtuelle, scope
├── rapport-surface-attaque/
│   ├── 01-nmap.md                # Commandes utilisées, ports ouverts, services, versions, NSE scripts
│   ├── 02-fuzzing-paths.md       # dirb/ffuf, wordlist utilisée, chemins découverts
│   ├── 03-burp-interception.md   # ≥1 capture Burp avec modification de requête expliquée
│   ├── 04-vulnerabilites-identifiees.md  # Liste des vulnérabilités plausibles (sans exploitation poussée)
│   └── 05-prochaines-etapes.md   # Quelles exploitations on tenterait en phase suivante (théorique)
├── captures/
│   ├── nmap-output.txt
│   ├── burp-proxy.png
│   └── ffuf-output.txt
└── RESUME.md
```

### Critères harnais

```yaml
checks:
  - id: repo_exists_public
    params: { name: 'cybersec-l1-w6-recon-active' }
  - id: file_exists
    params: { path: 'target.md', min_lines: 5 }
  - id: file_contains
    params: { path: 'target.md', pattern: '(?i)tryhackme|hackthebox' }
  - id: file_exists
    params: { path: 'rapport-surface-attaque/01-nmap.md', min_lines: 25 }
  - id: file_exists
    params: { path: 'rapport-surface-attaque/02-fuzzing-paths.md', min_lines: 15 }
  - id: file_exists
    params: { path: 'rapport-surface-attaque/03-burp-interception.md', min_lines: 15 }
  - id: file_exists
    params: { path: 'rapport-surface-attaque/04-vulnerabilites-identifiees.md', min_lines: 15 }
  - id: file_exists
    params: { path: 'captures/nmap-output.txt', min_size_bytes: 200 }
  - id: file_exists
    params: { path: 'captures/burp-proxy.png', mime: 'image/png' }
  - id: commits_signed
    params: { ratio_min: 1.0 }
```

### Quiz check-in (5 questions)

1. **QCM** — Quelle option nmap fait un scan TCP complet (handshake 3-way) plutôt qu'un SYN scan ?
   - a) `-sS`
   - b) **`-sT`** ✅
   - c) `-sU`
   - d) `-sV`
   - _Explication_ : `-sT` = TCP connect, plus bruyant (complète le handshake), utile quand on n'est pas root. `-sS` = SYN stealth scan. `-sU` = UDP. `-sV` = détection de version de service.

2. **QCM** — Que fait `nmap --script vuln <target>` ?
   - a) Lance toutes les exploitations possibles
   - b) **Lance les scripts NSE de la catégorie "vuln" (détection de vulnérabilités connues)** ✅
   - c) Crashe le serveur cible
   - d) Active le mode debug
   - _Explication_ : NSE = Nmap Scripting Engine. La catégorie `vuln` détecte des CVE connus. À utiliser avec discernement (peut être intrusif).

3. **Texte court** — Pourquoi le fuzzing de chemins (dirb/ffuf) est-il utile en recon active ?
   - _Réponse attendue_ : il permet de découvrir des endpoints/fichiers non liés dans le HTML public (ex : `/admin`, `/backup.zip`, `/.git/`, `/api/v2/`), souvent oubliés et non protégés.

4. **QCM** — Dans Burp Suite Community, quel onglet permet d'intercepter et modifier une requête en temps réel avant qu'elle parte ?
   - a) **Proxy → Intercept** ✅
   - b) Repeater
   - c) Scanner
   - d) Decoder
   - _Explication_ : Proxy/Intercept = man-in-the-middle local. Repeater = rejouer/modifier après coup. Scanner = audit auto (Pro only). Decoder = encodage/décodage.

5. **QCM** — Lancer un `nmap -p- -A scanme.nmap.org` est-il légal ?
   - a) Non, c'est toujours illégal de scanner une cible
   - b) **Oui, `scanme.nmap.org` est un host volontairement public pour tests autorisés** ✅
   - c) Uniquement avec une autorisation papier
   - d) Uniquement aux USA
   - _Explication_ : `scanme.nmap.org` est explicitement mis à dispo par l'auteur de nmap pour s'entraîner. Hors de cette cible et des labs autorisés (TryHackMe, HackTheBox), scanner sans autorisation peut tomber sous le coup de la loi (en France : article 323-1 du Code pénal).

### Badge associé

- **`active-scout`** — Débloqué après livrable W6 validé. Cumul `silent-watcher + active-scout` = compétence "Recon".

### Temps estimé

- Ressources : 8h
- Livrable : 4h30
- Quiz : 30 min
- **Total : ~13h**

---

## Semaine 7 — Cryptographie fondamentaux

### Objectifs

1. Distinguer hash, chiffrement symétrique, chiffrement asymétrique, signature.
2. Utiliser `openssl`, `age`, `gpg`/`ssh-keygen` pour des cas concrets (hash, chiffrer un fichier, signer ses commits, vérifier un certificat TLS).
3. Comprendre TLS 1.3 dans les grandes lignes (handshake, certificat, suites de chiffrement).

### Ressources (libres de droits)

| Ressource                                                                                                           | Type                |  Durée   | Pourquoi                                                     |
| ------------------------------------------------------------------------------------------------------------------- | ------------------- | :------: | ------------------------------------------------------------ |
| [Cryptography for developers — Practical Cryptography for Developers (Nakov, libre)](https://cryptobook.nakov.com/) | Livre en ligne      | 4h ciblé | Excellent niveau L1, exemples Python/JS                      |
| [Cloudflare — How does TLS work?](https://www.cloudflare.com/fr-fr/learning/ssl/what-is-ssl/)                       | Articles vulgarisés |    2h    | Pédagogie remarquable                                        |
| [age encryption documentation](https://github.com/FiloSottile/age)                                                  | Doc outil           |  30 min  | Alternative moderne et simple à GPG pour chiffrer un fichier |
| [GPG Quick Start (Ubuntu Wiki FR)](https://doc.ubuntu-fr.org/gnupg)                                                 | Tuto                |    1h    | Pour la signature de commits                                 |
| [OpenSSL cookbook (Ristic) — extraits libres](https://www.feistyduck.com/library/openssl-cookbook/)                 | Référence           |    1h    | Cas pratiques openssl                                        |
| [Hash function — Wikipedia FR](https://fr.wikipedia.org/wiki/Fonction_de_hachage)                                   | Encyclopédie        |  30 min  | Vue d'ensemble                                               |

### Livrable

Repo public `cybersec-l1-w7-crypto`.

```
cybersec-l1-w7-crypto/
├── README.md
├── theorie/
│   ├── 01-hash.md                # Hash : propriétés (déterminisme, avalanche, pre-image, collision), algos (SHA-256, SHA-3, BLAKE3)
│   ├── 02-symetrique.md          # AES-GCM, modes de chiffrement, gestion de clé
│   ├── 03-asymetrique.md         # RSA, ECDH, ECDSA, EdDSA — usages
│   └── 04-tls.md                 # Handshake TLS 1.3 schématisé + suites de chiffrement
├── pratique/
│   ├── 01-hash-openssl.sh        # Hash un fichier en SHA-256, BLAKE2 ; comparer hash de 2 fichiers ; HMAC
│   ├── 02-chiffrer-age.sh        # Chiffrer/déchiffrer un fichier avec age (clé X25519)
│   ├── 03-signer-fichier-gpg.sh  # Signer + vérifier un fichier avec gpg
│   ├── 04-inspecter-cert-tls.sh  # `openssl s_client` + `openssl x509` pour inspecter le cert d'un site
│   └── outputs/
│       ├── hash-comparison.txt
│       ├── tls-handshake.txt
│       └── cert-info.txt
├── signatures-commits/
│   └── README.md                 # Capture `git log --show-signature` prouvant que les commits sont signés GPG
└── RESUME.md
```

### Critères harnais

```yaml
checks:
  - id: repo_exists_public
    params: { name: 'cybersec-l1-w7-crypto' }
  - id: file_exists
    params: { path: 'theorie/01-hash.md', min_lines: 25 }
  - id: file_exists
    params: { path: 'theorie/02-symetrique.md', min_lines: 25 }
  - id: file_exists
    params: { path: 'theorie/03-asymetrique.md', min_lines: 25 }
  - id: file_exists
    params: { path: 'theorie/04-tls.md', min_lines: 25 }
  - id: file_exists
    params: { path: 'pratique/01-hash-openssl.sh', min_size_bytes: 200 }
  - id: file_exists
    params: { path: 'pratique/02-chiffrer-age.sh', min_size_bytes: 100 }
  - id: file_exists
    params: { path: 'pratique/03-signer-fichier-gpg.sh', min_size_bytes: 100 }
  - id: file_exists
    params: { path: 'pratique/04-inspecter-cert-tls.sh', min_size_bytes: 100 }
  - id: file_exists
    params: { path: 'pratique/outputs/cert-info.txt', min_size_bytes: 200 }
  - id: commits_signed
    params: { ratio_min: 1.0, min_signed_commits: 5 }
```

### Quiz check-in (5 questions)

1. **QCM** — Quelle propriété d'une fonction de hash cryptographique signifie "il est computationally infeasible de retrouver l'entrée à partir du hash" ?
   - a) Avalanche
   - b) **Pre-image resistance (résistance à la pré-image)** ✅
   - c) Déterminisme
   - d) Compression
   - _Explication_ : pre-image resistance = à partir d'un hash h, trouver un x tel que H(x)=h est computationally infeasible. C'est la propriété qui permet de stocker des hashs de mots de passe.

2. **QCM** — Chiffrement symétrique vs asymétrique : lequel est plus rapide pour de gros volumes ?
   - a) Asymétrique (ex : RSA)
   - b) **Symétrique (ex : AES)** ✅
   - c) Les deux sont équivalents
   - d) Ça dépend du système d'exploitation
   - _Explication_ : asymétrique est ~1000× plus lent. C'est pour ça que TLS utilise asymétrique pour échanger une clé symétrique, puis symétrique pour le contenu.

3. **Texte court** — En 1 phrase : qu'est-ce qu'une signature numérique et que prouve-t-elle ?
   - _Réponse attendue_ : utilisation d'une clé privée pour signer un message + vérification avec la clé publique correspondante — prouve l'authenticité de l'auteur ET l'intégrité du message (non-modification).

4. **QCM** — Lors du handshake TLS 1.3, qu'est-ce qui est échangé via cryptographie asymétrique ?
   - a) Tout le contenu de la session
   - b) **Une clé symétrique éphémère (via ECDHE) qui servira ensuite à chiffrer la session** ✅
   - c) Le mot de passe utilisateur
   - d) Le hash du certificat
   - _Explication_ : Diffie-Hellman éphémère (ECDHE) permet d'établir un secret partagé sans qu'aucun secret ne soit transmis directement, et garantit la "forward secrecy" (si la clé privée du serveur fuite plus tard, les sessions passées restent sûres).

5. **QCM** — Tu veux chiffrer un fichier pour l'envoyer à un collègue. Tu utilises age. Quelle clé as-tu besoin pour le chiffrer ?
   - a) Ta propre clé privée
   - b) **La clé publique de ton collègue** ✅
   - c) Ta propre clé publique
   - d) Un mot de passe partagé
   - _Explication_ : on chiffre toujours avec la clé publique du destinataire (lui seul a la privée correspondante pour déchiffrer). Asymétrique 101.

### Badge associé

- **`cipher-apprentice`** — Débloqué après livrable W7 validé. Symbolise la compréhension des primitives crypto.

### Temps estimé

- Ressources : 9h
- Livrable : 3h
- Quiz : 30 min
- **Total : ~12h30**

---

## Semaine 8 — Défense : headers, CSP, logs, IDS

### Objectifs

1. Renforcer (hardening) une application web Express fournie avec des défenses standards.
2. Comprendre le rôle des headers HTTP de sécurité et configurer une CSP fonctionnelle.
3. Mettre en place une journalisation utile à la détection d'incident, et installer un IDS basique (fail2ban ou règles côté app).

### Ressources (libres de droits)

| Ressource                                                                                            | Type          | Durée  | Pourquoi                                              |
| ---------------------------------------------------------------------------------------------------- | ------------- | :----: | ----------------------------------------------------- |
| [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)                        | Référence     |   1h   | Liste exhaustive avec valeurs recommandées            |
| [Content Security Policy reference (MDN)](https://developer.mozilla.org/fr/docs/Web/HTTP/CSP)        | Doc           |   2h   | La CSP est la défense XSS post-2020 — savoir l'écrire |
| [Helmet.js documentation](https://helmetjs.github.io/)                                               | Doc librairie |   1h   | Implémentation pratique pour Express                  |
| [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | Cheatsheet    |   1h   | Quoi logger, comment, anti-patterns (PII)             |
| [fail2ban documentation](https://github.com/fail2ban/fail2ban/wiki)                                  | Doc           |   1h   | Outil défensif de référence                           |
| [TryHackMe — Defensive Security Intro (gratuite)](https://tryhackme.com/room/defensivesecurity)      | Lab           |  1h30  | Vue blue team                                         |
| [Mozilla Observatory](https://observatory.mozilla.org/)                                              | Outil scan    | 30 min | Re-scanner ton app pour mesurer le hardening          |

### Livrable

Le formateur fournit un repo template **vulnérable** à forker : `cursus-app/cybersec-l1-w8-target` (app Express minimale avec endpoints "à hardener"). Le stagiaire fork → harden → ouvre une PR sur son propre fork.

Repo public `cybersec-l1-w8-defense` (fork du template) avec :

```
cybersec-l1-w8-defense/
├── README.md                     # Décrit ce qui a été hardené
├── HARDENING-LOG.md              # Pas-à-pas chronologique des hardening (1 commit = 1 défense)
├── src/                          # Code Express modifié
│   ├── app.js                    # Avec Helmet, rate limit, etc.
│   ├── middlewares/
│   │   ├── csp.js
│   │   ├── rate-limit.js
│   │   └── logger.js
│   └── routes/
├── tests/
│   ├── headers.test.js           # Tests qui vérifient la présence des headers
│   └── csp.test.js
├── deploy/
│   ├── fail2ban.local.example    # Conf fail2ban
│   └── nginx.conf.example        # Conf reverse proxy avec headers
├── audit/
│   ├── observatory-before.png    # Note Mozilla Observatory avant
│   ├── observatory-after.png     # Note après — gain visible
│   └── score-comparison.md
└── RESUME.md
```

### Critères harnais

```yaml
checks:
  - id: repo_exists_public
    params: { name: 'cybersec-l1-w8-defense', forked_from: 'cursus-app/cybersec-l1-w8-target' }
  - id: file_exists
    params: { path: 'HARDENING-LOG.md', min_lines: 20 }
  - id: file_exists
    params: { path: 'src/middlewares/csp.js', min_size_bytes: 200 }
  - id: file_exists
    params: { path: 'src/middlewares/rate-limit.js', min_size_bytes: 100 }
  - id: file_exists
    params: { path: 'src/middlewares/logger.js', min_size_bytes: 200 }
  - id: file_exists
    params: { path: 'tests/headers.test.js', min_size_bytes: 300 }
  - id: file_exists
    params: { path: 'deploy/fail2ban.local.example', min_size_bytes: 100 }
  - id: file_exists
    params: { path: 'audit/observatory-before.png', mime: 'image/png' }
  - id: file_exists
    params: { path: 'audit/observatory-after.png', mime: 'image/png' }
  - id: file_exists
    params: { path: 'audit/score-comparison.md', min_lines: 5 }
  - id: file_contains
    params: { path: 'src/app.js', pattern: '(?i)helmet|csp|content-security-policy' }
  - id: commits_signed
    params: { ratio_min: 1.0 }
```

Bonus (non bloquant) : `tests/headers.test.js` exécuté en CI sur le repo doit passer (`npm test`).

### Quiz check-in (5 questions)

1. **QCM** — Quelle valeur de CSP est la plus stricte (donc la plus défensive) pour `script-src` ?
   - a) `*`
   - b) `'unsafe-inline'`
   - c) **`'self'` (sans `'unsafe-inline'` ni `'unsafe-eval'`)** ✅
   - d) `data:`
   - _Explication_ : `'self'` autorise uniquement les scripts servis depuis la même origine. Pas d'inline, pas d'eval — XSS très difficile à exploiter même si une faille existe ailleurs.

2. **QCM** — Helmet.js, c'est :
   - a) Un firewall réseau
   - b) **Un middleware Express qui pose une douzaine de headers HTTP de sécurité par défaut** ✅
   - c) Un WAF dans le navigateur
   - d) Un linter de sécurité
   - _Explication_ : Helmet pose HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, etc. Une ligne `app.use(helmet())` couvre 80% des headers de base.

3. **Texte court** — Cite 2 informations qu'on ne doit **jamais** logger.
   - _Réponse attendue (2 sur)_ : mots de passe en clair, tokens d'authentification (JWT, session), numéros de CB / IBAN complets, données de santé, mots de passe hashés bruts, secrets API.

4. **QCM** — fail2ban fait quoi ?
   - a) Il chiffre les logs
   - b) **Il scrute les logs (SSH, web, etc.) et bannit des IPs au firewall après N tentatives échouées** ✅
   - c) Il signe les commits
   - d) Il génère des rapports OWASP
   - _Explication_ : fail2ban est un classique de l'hardening Linux. Avec un jail SSH bien configuré, on élimine 99% des bruteforce sur SSH.

5. **QCM** — Tu vois dans tes logs des centaines d'erreurs `404` venant d'une seule IP en 10 secondes sur des chemins comme `/wp-admin`, `/.env`, `/phpinfo.php`. C'est probablement :
   - a) Un utilisateur perdu
   - b) **Un scan automatisé cherchant des vulnérabilités connues** ✅
   - c) Un bug de routing
   - d) Une mise à jour DNS
   - _Explication_ : pattern de scan classique. Action : bannir l'IP, vérifier qu'aucun de ces chemins ne répond, considérer fail2ban ou WAF.

### Badge associé

- **`blue-defender`** — Débloqué après livrable W8 validé. Symbolise la maîtrise des défenses applicatives de base.

### Temps estimé

- Ressources : 8h
- Livrable : 4h
- Quiz : 30 min
- **Total : ~12h30**

---

## Capstone (semaines 9-10) — Audit de sécurité complet

### Sujet (énoncé 1 page à donner au stagiaire)

> Tu es **mandaté en tant que pentesteur junior** par une équipe sécurité fictive (en réalité : le formateur) pour conduire un audit de sécurité **boîte grise** sur une application web cible désignée.
>
> **Cible** : une room TryHackMe gratuite spécifique (au choix du formateur parmi : `Pickle Rick`, `Vulnversity`, `Basic Pentesting`, `Mr Robot CTF`, `Agent Sudo` — autres possibles si justifiées et autorisées) **OU** la machine "Starting Point" de HackTheBox.
>
> **Cadre légal** : tu disposes d'une **autorisation explicite** d'auditer cette cible via la plateforme TryHackMe/HackTheBox (CGU acceptées lors de la création de ton compte). Aucune action en dehors du périmètre n'est tolérée.
>
> **Mission** :
>
> 1. Conduire une phase de **recon passive** (whois, DNS, certificats — quand applicable)
> 2. Conduire une phase de **recon active** (nmap, fuzzing, Burp Suite)
> 3. **Identifier au moins 3 vulnérabilités** d'impact significatif
> 4. Pour chaque vulnérabilité, **tenter une exploitation contrôlée** (sans destruction de données)
> 5. **Classer chaque vulnérabilité** selon CVSS 3.1 (Critical / High / Medium / Low) en justifiant la note
> 6. Proposer **3 remédiations actionnables par vulnérabilité** (court terme / moyen terme / long terme)
> 7. Rédiger un **rapport d'audit professionnel** (PDF + Markdown) destiné à une équipe technique
> 8. Soutenir oralement ton audit devant le formateur (30 min)

### Délai

**14 jours calendaires** à compter du démarrage. La soutenance est programmée par Mohamed dans la fenêtre J+14 / J+18.

### Livrable attendu

Repo GitHub **public** `cybersec-l1-capstone-<handle>` avec :

```
cybersec-l1-capstone-<handle>/
├── README.md                     # Pitch + table des matières + disclaimer légal
├── 01-scope/
│   ├── perimetre.md              # Cible, périmètre, autorisation, exclusions
│   └── timeline.md               # Planning réel suivi sur 14 jours
├── 02-methodologie/
│   ├── README.md                 # Approche (PTES, OWASP WSTG…)
│   └── outils.md                 # Liste des outils utilisés + versions
├── 03-recon/
│   ├── passive.md
│   └── active.md
├── 04-vulnerabilites/
│   ├── 01-<nom-vuln>/
│   │   ├── README.md             # Title, CVSS, description, reproduction, impact, remediation
│   │   ├── poc/                  # Captures, scripts de reproduction
│   │   └── remediation.md
│   ├── 02-<nom-vuln>/
│   ├── 03-<nom-vuln>/
│   └── ... (≥3 obligatoires)
├── 05-rapport/
│   ├── rapport-audit.md          # Rapport complet au format Markdown
│   └── rapport-audit.pdf         # Version PDF générée (pandoc OK)
├── 06-soutenance/
│   ├── slides.pdf                # Slides présentation (5-10 slides)
│   └── notes-orateur.md
└── 07-annexes/
    ├── nmap-scans/
    ├── burp-history/
    └── outils-logs/
```

Le `rapport-audit.pdf` doit contenir au minimum :

- Résumé exécutif (1 page, vulgarisé pour management)
- Méthodologie
- Synthèse des vulnérabilités (tableau classé par sévérité)
- Détail de chaque vulnérabilité (1-2 pages chacune)
- Plan de remédiation priorisé
- Annexes techniques

### Critères harnais

```yaml
checks:
  - id: repo_exists_public
    params: { name_regex: '^cybersec-l1-capstone-.+' }
  - id: file_exists
    params: { path: '01-scope/perimetre.md', min_lines: 15 }
  - id: file_exists
    params: { path: '01-scope/timeline.md', min_lines: 10 }
  - id: file_exists
    params: { path: '02-methodologie/README.md', min_lines: 20 }
  - id: file_exists
    params: { path: '03-recon/passive.md', min_lines: 20 }
  - id: file_exists
    params: { path: '03-recon/active.md', min_lines: 25 }
  - id: file_exists
    params: { path: '04-vulnerabilites', is_directory: true, min_subdirs: 3 }
  - id: file_exists
    params: { path: '05-rapport/rapport-audit.md', min_lines: 100 }
  - id: file_exists
    params: { path: '05-rapport/rapport-audit.pdf', mime: 'application/pdf', min_size_bytes: 50000 }
  - id: file_exists
    params: { path: '06-soutenance/slides.pdf', mime: 'application/pdf' }
  - id: file_contains
    params: { path: 'README.md', pattern: '(?i)tryhackme|hackthebox|autorisation' }
  - id: file_contains
    params: { path: '05-rapport/rapport-audit.md', pattern: '(?i)cvss' }
  - id: commits_signed
    params: { ratio_min: 1.0, min_signed_commits: 10 }
```

### Grille d'évaluation soutenance (5 critères × note /4)

| Critère                       | Description                                                                                                                                                                                 |  /4 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --: |
| **Compréhension technique**   | Le stagiaire explique correctement chaque vulnérabilité, son mécanisme, son impact. Sait répondre aux "pourquoi ça marche".                                                                 |     |
| **Qualité du livrable**       | Repo bien structuré, rapport PDF lisible, captures pertinentes, méthodologie claire et reproductible. Pas de fautes grossières (orthographe, vocabulaire sécu mal utilisé).                 |     |
| **Clarté de présentation**    | 20 min tiennent dans le temps imparti, slides lisibles, narrative cohérente (scope → recon → vulns → remédiation), gestion de l'attention.                                                  |     |
| **Gestion des questions**     | Sait répondre aux questions précises, dire "je ne sais pas" sans bluffer, proposer des pistes quand bloqué.                                                                                 |     |
| **Originalité / dépassement** | A trouvé une vulnérabilité non triviale, a proposé une remédiation créative, ou a démontré une compréhension allant au-delà du strict attendu (ex : remontée d'un CVE pas dans les guides). |     |

Note totale sur **20**.

### Mention selon score

| Score      | Mention                                  | Conséquence                                                                                                                                          |
| ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| < 10/20    | **Non validé**                           | Reprise 1 semaine + nouvelle soutenance. Si échec persistant : entretien avec Mohamed pour analyser le blocage.                                      |
| 10 - 12/20 | **Validé sous conditions**               | Validé mais avec un plan d'action 30 jours pour combler les lacunes identifiées (modules à reprendre, ressources complémentaires).                   |
| 13 - 15/20 | **Validé**                               | Certificat émis, badge `pentester-l1` débloqué.                                                                                                      |
| 16 - 18/20 | **Validé avec mention**                  | Mention "Très bien" sur le certificat, badge bonus `excellence-capstone`.                                                                            |
| 19 - 20/20 | **Validé avec mention + recommandation** | Mention "Excellent" + lettre de recommandation personnalisée + repo capstone mis en avant sur la galerie publique Cursus (avec accord du stagiaire). |

### Badge associé

- **`pentester-l1`** — Débloqué quand le capstone est validé (note ≥13/20) ET le harnais valide la complétude du repo ET la soutenance a eu lieu.

### Temps estimé

- Recon et exploitation : 12-15h
- Rédaction rapport : 8-10h
- Préparation soutenance : 3-5h
- Soutenance : 30 min
- **Total : ~25-30h sur 14 jours**

---

## Annexes

### A. Mapping compétences → semaines

| Compétence               | Semaines couvertes |
| ------------------------ | ------------------ |
| Terminal + Git           | S1                 |
| Hygiène & HTTP           | S2                 |
| OWASP Top 10             | S3, S4             |
| Recon (passive + active) | S5, S6             |
| Cryptographie            | S7                 |
| Défense applicative      | S8                 |
| Synthèse opérationnelle  | Capstone           |

### B. Stack outils utilisés (récapitulatif)

| Outil                      | Semaine  | Type               |
| -------------------------- | -------- | ------------------ |
| bash, git, gpg, ssh-keygen | S1, S7   | CLI fondamental    |
| curl, dig, whois           | S2, S5   | CLI réseau         |
| Docker                     | S3, S4   | Lab                |
| OWASP Juice Shop / DVWA    | S3       | Lab vulnérable     |
| Burp Suite Community       | S4, S6   | Proxy interception |
| nmap, ffuf, dirb           | S6       | Recon active       |
| openssl, age               | S7       | Crypto             |
| Helmet, fail2ban           | S8       | Défense            |
| Pandoc                     | Capstone | Rapport PDF        |

### C. Politique de réessai harnais

Pour chaque livrable hebdo, **3 tentatives de soumission** sont autorisées (limite Cursus standard). Au-delà, l'override formateur est requis. Le formateur peut accorder une 4ème tentative sans pénalité si la cause est documentée (ex : bug du harnais, panne d'outil tiers).

### D. Modalités d'accompagnement

- **Standup hebdo** : visio collective 30 min en début de semaine — questions de la semaine passée, intro à la semaine en cours.
- **Bouton "Je suis bloqué"** : réponse formateur sous 24h ouvrées.
- **Pas de support 24/7** : c'est un cursus async, pas une hotline. Le stagiaire apprend aussi à se débloquer seul (StackOverflow, docs, lecture du rapport harnais).

### E. Légalité — rappel obligatoire à chaque semaine

> Toutes les manipulations offensives de ce cursus se font **exclusivement** sur :
>
> - Des labs locaux (OWASP Juice Shop, DVWA installés sur ta machine)
> - Des plateformes d'entraînement légales (TryHackMe rooms gratuites, HackTheBox Starting Point, PortSwigger Academy)
> - `scanme.nmap.org` pour `nmap`
>
> **Toute action offensive sur une cible non autorisée** est passible de poursuites (en France : article 323-1 et suivants du Code pénal — jusqu'à 3 ans de prison et 100 000 € d'amende). Si tu doutes : demande au formateur avant d'agir.

### F. Évolutions futures du cursus (parked)

- **Module 9 bonus** : sécurité mobile (Android Studio + Frida — cible L2)
- **Module 10 bonus** : sécurité cloud (AWS IAM, S3 leaks — cible L2)
- **Spécialisation Red vs Blue** post-L1
- **Intégration d'un CTF interne Cursus** entre cohortes (post-pilote)

---

_Document maintenu par Mohamed. Dernière révision : 2026-06-21. Voir aussi `docs/product/13-ressources-externes.md` pour le catalogue ressources complet._
