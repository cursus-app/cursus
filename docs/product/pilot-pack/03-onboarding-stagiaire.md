# Bienvenue chez Cursus — Onboarding stagiaire en 5 minutes

> Document à remettre au stagiaire **le jour 1**, juste après la création de son compte. Imprimable en 1-2 pages A4. Volontairement court — la doc longue, c'est la FAQ.

---

## C'est quoi Cursus ?

**Cursus, c'est trois choses** :

1. Un **chemin clair** de 8 semaines pour apprendre la cybersécurité par la pratique. Pas de hasard — tu sais à tout moment ce qui vient cette semaine et la suivante.
2. Un **système qui vérifie ton travail tout seul** : tu pousses un repo GitHub, le harnais Cursus regarde, te dit "validé" ou "il manque ça". Pas besoin d'attendre une semaine pour avoir un retour.
3. Un **portfolio public** qui se construit en temps réel. À la fin : 10 réalisations + 1 capstone + un certificat numérique vérifiable.

**En une phrase** : tu apprends en livrant, et chaque livraison s'ajoute à ta carte de visite professionnelle.

---

## Ton rythme — chaque semaine, 3 choses

Du lundi au dimanche, tu vas faire **3 actions cycliques** :

### 1. Lire/pratiquer les ressources de la semaine

- ~8h sur des articles, vidéos, ateliers interactifs (TryHackMe, PortSwigger, OWASP, MDN…)
- Tout est listé dans la page **"Cette semaine"** de ton dashboard Cursus
- Tout est gratuit, tout est libre de droits

### 2. Produire le livrable hebdo

- Un **repo GitHub** avec une structure précise (README, fichiers nommés, captures, etc.)
- Le détail attendu est dans la page **"Cette semaine"**, section "Livrable"
- **3 tentatives** autorisées avant qu'on bascule en override manuel

### 3. Passer le quiz check-in (5 questions, 10 min)

- À faire après avoir soumis le livrable
- Score visible immédiatement, **3 tentatives** max, on garde la meilleure note
- Si score <4/5 sur deux tentatives, je te recontacte pour qu'on revoie le module

À la fin de la semaine, si livrable validé + quiz ≥4/5 → tu **débloques le badge** de la semaine. C'est cumulatif.

---

## Comment soumettre un livrable

1. Tu finis ton livrable dans ton repo GitHub (ex : `cybersec-l1-w1-toolbox`)
2. Tu pousses ton dernier commit sur la branche `main` (ou la branche demandée)
3. Tu vas dans Cursus → **"Cette semaine"** → bouton bleu **"Soumettre"**
4. Tu colles l'URL de ton repo et tu cliques **"Lancer la validation"**
5. Le harnais tourne (généralement <3 min). Tu vois le rapport en direct.
6. Si vert : célèbre, prends ton badge, attaque la semaine suivante.
7. Si rouge : lis le rapport, **corrige**, repousse, re-soumets. (Le harnais te dit précisément ce qui manque.)

> ⚙️ Pas besoin d'attendre la fin de la semaine pour soumettre. Soumets dès que tu penses être prêt. Soumets plusieurs fois si besoin.

---

## Que faire si tu es bloqué

Cursus a un **bouton "Je suis bloqué"** sur chaque page. Voici quand cliquer :

| Situation                                                    | Action recommandée                                      |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| "Je ne comprends pas une consigne"                           | Bouton "Je suis bloqué" → catégorie "Consigne floue"    |
| "Mon harnais échoue mais je ne vois pas pourquoi"            | Bouton "Je suis bloqué" → catégorie "Harnais incompris" |
| "Une ressource externe ne marche pas (lien mort, lab cassé)" | Bouton "Je suis bloqué" → catégorie "Ressource KO"      |
| "Bug dans l'app Cursus"                                      | Bouton "Je suis bloqué" → catégorie "Bug Cursus"        |
| "Question générale / je veux discuter d'un choix"            | Visio collective du lundi 18h OU email direct           |

**Réponse garantie sous 24h ouvrées.** En pratique : généralement <4h en semaine.

> 🧠 Avant de cliquer "Je suis bloqué", essaie 3 choses :
>
> 1. Relire la consigne entièrement
> 2. Lire le rapport du harnais (souvent il pointe le problème exact)
> 3. Chercher 10 min sur Google / la doc officielle de l'outil utilisé
>
> Si après ça tu es toujours bloqué → clique sans hésiter. C'est précisément à ça que sert le bouton.

---

## Comment voir ta progression

Trois vues utiles dans ton dashboard :

### 1. Page d'accueil "Cette semaine"

- Ce que tu dois faire cette semaine
- Les ressources, le livrable attendu, le quiz
- Bouton de soumission

### 2. Page "Ma progression"

- Frise des 8 semaines : où tu en es, ce qui est validé, ce qui reste
- Badges débloqués + badges à venir
- XP cumulés (info indicative, sans classement vs les autres)

### 3. Page "Mon portfolio"

- URL publique : `cursus.com/portfolio/[ton-handle]`
- Visible par n'importe qui à qui tu donnes le lien
- Auto-mise à jour à chaque livrable validé
- À ajouter dans la signature de ton CV / LinkedIn dès la semaine 3

---

## Ton portfolio public

C'est la pièce centrale de Cursus.

**Ce qu'on y voit** :

- Ton nom + handle GitHub + avatar
- Les badges débloqués (visuels)
- Les repos liés à chaque livrable validé (avec preview)
- Le capstone et son rapport (en fin de cursus)
- Le certificat (au standard Open Badges 3.0, vérifiable par URL publique)

**Pourquoi c'est important** :

- C'est **ton CV technique** pour la cybersec
- Tu peux le partager dès la semaine 3 (3 repos visibles)
- Un recruteur peut cliquer et **vérifier en 30 secondes** que tu as vraiment fait le travail
- Tu n'as plus à "dire" que tu sais faire — tu **montres**

**Ton contrôle** :

- Tu peux à tout moment passer ton portfolio en privé (visible uniquement par toi)
- Tu peux masquer un repo spécifique si tu n'en es pas fier (mais alors il ne compte pas dans la validation finale)
- Tu peux supprimer ton compte → ton portfolio disparaît

---

## Les 5 règles d'or de la cohorte pilote

1. **Pousse souvent, pousse en signé.** Tous les commits doivent être signés (GPG ou SSH). Le harnais vérifie.
2. **Tu n'attaques que ce que tu as le droit d'attaquer.** Labs locaux (Juice Shop, DVWA), TryHackMe rooms gratuites, PortSwigger Academy, `scanme.nmap.org`. Hors de ça → tu demandes.
3. **Tu n'écris jamais de secrets dans ton code.** Pas de mot de passe, pas de clé API, pas de `.env`. Le harnais détecte et bloque.
4. **Tu donnes du feedback honnête.** Le formulaire hebdo de 15 min est _le_ livrable critique pour moi. C'est ce qui fait avancer le produit.
5. **Tu demandes quand tu doutes.** Pas de question stupide — surtout pendant le pilote.

---

## Premier jour — checklist

Coche au fur et à mesure :

- [ ] Compte Cursus créé + 2FA TOTP activé (Google Authenticator / Aegis / 1Password)
- [ ] Compte GitHub créé (ou existant), handle pro choisi
- [ ] Clé SSH ou GPG configurée pour signer tes commits ([guide GitHub](https://docs.github.com/en/authentication/managing-commit-signature-verification))
- [ ] Outils installés : Git, terminal (WSL2 si Windows), Docker Desktop
- [ ] Profil Cursus complété : avatar + nom affiché + bio courte
- [ ] FAQ lue ([01-faq-stagiaires.md](./02-faq-stagiaires.md))
- [ ] Invitation au kick-off acceptée (visio le **[date]**)
- [ ] Page "Cette semaine" explorée — tu vois ce qui t'attend en S1

---

## En cas d'urgence

| Problème                                                       | Contact                                          |
| -------------------------------------------------------------- | ------------------------------------------------ |
| Bug bloquant sur Cursus                                        | Bouton "Je suis bloqué" → catégorie "Bug Cursus" |
| Email perdu / 2FA cassée                                       | `mohamed@[domaine].com`                          |
| Compte GitHub compromis                                        | Voir ce guide GitHub puis prévenir Mohamed       |
| Doute légal (j'ai attaqué un truc, je pense pas être autorisé) | **Mohamed direct, immédiatement** — on règle     |

---

**Bienvenue dans la première cohorte. Vraiment, merci.**

— Mohamed

_Onboarding v1.0 — 2026-06-21_
