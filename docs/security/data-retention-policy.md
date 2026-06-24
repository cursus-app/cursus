# Politique de Rétention des Données

> **Cursus — Data Retention Policy v1.0 — 2026-06-24**
>
> Conforme RGPD article 5.1.e (limitation de la conservation). Révisée annuellement ou à chaque changement réglementaire.

---

## Principes directeurs

1. **Minimisation** : ne conserver les données que le temps strictement nécessaire à leur finalité.
2. **Transparence** : chaque durée est justifiée par une base légale explicite.
3. **Automatisation** : les purges sont automatiques (Inngest cron quotidien) — aucune action manuelle.
4. **Auditabilité** : chaque purge est loggée dans l'audit log Cursus.

---

## Tableau de rétention

| Catégorie                                   | Durée de conservation                               | Base légale                                            | Action de fin de vie                                   |
| ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| **Profil utilisateur (email, prénom, nom)** | Durée de vie du compte + 30 jours après suppression | Exécution du contrat (art. 6.1.b)                      | Suppression hard après délai de grâce                  |
| **Soumissions (livrables, code)**           | Clôture de la cohorte + 24 mois                     | Intérêt légitime — portfolio du stagiaire (art. 6.1.f) | Anonymisation (pseudonymisation nom → UUID)            |
| **HarnessRun (résultats harnais)**          | Clôture de la cohorte + 24 mois                     | Idem                                                   | Anonymisation                                          |
| **Quiz attempts**                           | Clôture de la cohorte + 12 mois                     | Intérêt légitime — analyse pédagogique                 | Suppression hard                                       |
| **Audit log**                               | 12 mois glissants                                   | Obligation légale (preuve + sécurité)                  | Suppression hard                                       |
| **Logs applicatifs (Pino / Sentry)**        | 30 jours                                            | Intérêt légitime — débogage                            | Suppression automatique (Sentry: 90j max)              |
| **Logs de sécurité (login, auth events)**   | 12 mois                                             | Obligation sécurité (art. 32 RGPD)                     | Suppression hard                                       |
| **Sessions auth (Supabase)**                | 30 jours après déconnexion                          | Exécution du contrat                                   | Révocation automatique (Supabase)                      |
| **Notifications in-app**                    | 90 jours après lecture                              | Intérêt légitime                                       | Suppression hard                                       |
| **Exports GDPR (ZIP)**                      | 7 jours (URL signée expirée)                        | Portabilité (art. 20 RGPD)                             | Suppression du Storage Supabase                        |
| **Certificats**                             | Indéfiniment (actif du stagiaire)                   | Exécution du contrat + intérêt légitime                | Anonymisation sur demande d'oubli                      |
| **user_consents (acceptation CGU)**         | Durée vie du compte + 5 ans                         | Obligation légale — preuve de consentement             | Suppression hard                                       |
| **Comptes inactifs**                        | Avertissement à 12 mois, suppression à 18 mois      | Minimisation (art. 5.1.e RGPD)                         | Email d'avertissement → suppression avec délai opt-out |
| **Données de paiement**                     | N/A (géré par Stripe, hors scope Cursus)            | —                                                      | —                                                      |

---

## Jobs de purge automatisés (Inngest)

### Architecture

```
Inngest Cron (quotidien, 02:00 UTC)
  ├── purge/notifications          → DELETE notifications lues > 90j
  ├── purge/gdpr-exports           → DELETE Storage signedUrl expirée > 7j
  ├── purge/quiz-attempts          → DELETE quiz_attempts cohorte clôturée > 12m
  ├── purge/audit-logs             → DELETE audit_logs > 12m
  ├── purge/app-logs               → Géré par Sentry retention policy (90j max)
  └── purge/inactive-accounts      → (1) Email warning si 12m inactif, (2) Suppression si 18m
```

### Pseudocode du job principal

```typescript
// server/inngest/purge-data.ts
export const purgeData = inngest.createFunction(
  { id: 'purge-data', name: 'Purge données RGPD' },
  { cron: '0 2 * * *' }, // tous les jours à 02:00 UTC
  async ({ logger }) => {
    const now = new Date();

    // Notifications lues > 90j
    const notifResult = await prisma.notification.deleteMany({
      where: { readAt: { lt: subDays(now, 90) } },
    });
    logger.info({ count: notifResult.count }, 'purge:notifications');

    // Audit logs > 12 mois
    const auditResult = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: subMonths(now, 12) } },
    });
    logger.info({ count: auditResult.count }, 'purge:audit-logs');

    // ... autres purges

    return { purged: { notifications: notifResult.count, auditLogs: auditResult.count } };
  },
);
```

> **Note** : Les jobs de purge seront implémentés au fil de l'ajout des tables correspondantes dans le schéma Prisma. Ce document décrit la politique ; l'implémentation suit dans les Stories EP-08 (Notifications) et EP-09 (Audit).

---

## Comptes inactifs

**Définition de l'inactivité** : aucune connexion depuis X mois.

| Milestone              | Action                                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| 12 mois sans connexion | Email d'avertissement : "Votre compte sera supprimé dans 6 mois si vous ne vous connectez pas." |
| 15 mois sans connexion | Email de rappel final                                                                           |
| 18 mois sans connexion | Suppression automatique du compte (avec opt-out : lien "Garder mon compte" dans les emails)     |

**Exception** : les comptes avec des certificats émis ne sont jamais supprimés, seulement anonymisés (l'email devient `deleted-[cuid]@anonymous.cursus.app`, nom/prénom mis à null).

---

## Droits des utilisateurs

| Droit (RGPD)            | Délai légal | Implémentation Cursus                           |
| ----------------------- | ----------- | ----------------------------------------------- |
| Accès (art. 15)         | 30 jours    | Export GDPR ZIP (ST-15.1)                       |
| Rectification (art. 16) | 30 jours    | Via Mon Profil                                  |
| Effacement (art. 17)    | 30 jours    | Via Mon Profil > Supprimer mon compte (ST-15.2) |
| Portabilité (art. 20)   | 30 jours    | Export GDPR ZIP (ST-15.1)                       |
| Opposition (art. 21)    | Immédiat    | Désabonnement email en 1 clic                   |

---

## Contact DPO

Email : privacy@cursus.app

En l'absence d'un DPO dédié au lancement du pilote, Mohamed Sadjad (responsable de traitement) assure cette fonction.

---

## Révisions

| Date       | Version | Auteur                  | Changement       |
| ---------- | ------- | ----------------------- | ---------------- |
| 2026-06-24 | 1.0.0   | Mohamed Sadjad / Claude | Version initiale |
