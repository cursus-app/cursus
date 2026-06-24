<script setup lang="ts">
/**
 * /legal/privacy — ST-15.3
 *
 * Politique de Confidentialité de Cursus v1.0.0.
 * Conformité RGPD : articles 13 et 14 (information des personnes concernées).
 */
useHead({
  title: 'Politique de confidentialité',
  meta: [
    {
      name: 'description',
      content:
        'Politique de confidentialité de Cursus — données collectées, base légale RGPD, droits des utilisateurs.',
    },
    { name: 'robots', content: 'index, follow' },
  ],
});
</script>

<template>
  <div class="min-h-screen bg-app">
    <div class="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <!-- Fil d'Ariane -->
      <nav aria-label="Fil d'Ariane" class="mb-8">
        <ol class="flex items-center gap-2 text-sm text-text-muted">
          <li>
            <NuxtLink
              to="/"
              class="hover:text-text-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Accueil
            </NuxtLink>
          </li>
          <li aria-hidden="true">
            <span class="i-tabler-chevron-right size-3" />
          </li>
          <li>
            <span class="text-text-default" aria-current="page">Politique de confidentialité</span>
          </li>
        </ol>
      </nav>

      <article>
        <header class="mb-10">
          <h1 class="text-3xl font-semibold tracking-tight text-text-strong">
            Politique de confidentialité
          </h1>
          <p class="mt-2 text-sm text-text-muted">Version 1.0.0 — 24 juin 2026</p>
        </header>

        <!-- Table des matières -->
        <nav
          aria-label="Table des matières"
          class="mb-10 rounded-lg border border-border-subtle bg-surface px-5 py-4"
        >
          <h2 class="mb-3 text-sm font-semibold tracking-wide text-text-muted uppercase">
            Sommaire
          </h2>
          <ol class="space-y-1 text-sm">
            <li>
              <a
                href="#pc-1"
                class="text-accent-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >1. Responsable du traitement</a
              >
            </li>
            <li>
              <a
                href="#pc-2"
                class="text-accent-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >2. Données collectées</a
              >
            </li>
            <li>
              <a
                href="#pc-3"
                class="text-accent-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >3. Base légale des traitements</a
              >
            </li>
            <li>
              <a
                href="#pc-4"
                class="text-accent-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >4. Durée de conservation</a
              >
            </li>
            <li>
              <a
                href="#pc-5"
                class="text-accent-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >5. Droits des utilisateurs</a
              >
            </li>
            <li>
              <a
                href="#pc-6"
                class="text-accent-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >6. Cookies</a
              >
            </li>
            <li>
              <a
                href="#pc-7"
                class="text-accent-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >7. Transfert hors UE</a
              >
            </li>
          </ol>
        </nav>

        <div class="space-y-10 text-text-default">
          <!-- 1. Responsable -->
          <section id="pc-1">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">
              1. Responsable du traitement
            </h2>
            <p class="leading-relaxed">
              Le responsable du traitement des données personnelles collectées via Cursus est
              l'équipe Cursus. Pour toute question relative au traitement de vos données, vous
              pouvez contacter notre délégué à la protection des données (DPO) :
            </p>
            <address
              class="mt-3 rounded-lg border border-border-subtle bg-surface px-4 py-3 text-sm not-italic"
            >
              <strong class="text-text-strong">DPO Cursus</strong><br />
              <a
                href="mailto:privacy@cursus.app"
                class="font-medium text-accent-text underline-offset-2 hover:underline"
              >
                privacy@cursus.app
              </a>
            </address>
          </section>

          <!-- 2. Données collectées -->
          <section id="pc-2">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">2. Données collectées</h2>
            <p class="leading-relaxed">Cursus collecte les catégories de données suivantes :</p>
            <ul class="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong class="text-text-strong">Données d'identification :</strong>
                adresse e-mail, prénom, nom de famille, identifiant GitHub (optionnel).
              </li>
              <li>
                <strong class="text-text-strong">Données d'usage :</strong>
                livrables soumis (URLs de dépôts GitHub), résultats du harnais de validation, scores
                et réponses aux quiz, badges obtenus, progression XP.
              </li>
              <li>
                <strong class="text-text-strong">Données techniques :</strong>
                logs anonymisés (adresse IP hashée, user-agent, horodatages d'accès). Ces données ne
                permettent pas d'identifier un utilisateur individuellement.
              </li>
            </ul>
            <div class="mt-4 rounded-lg border border-border-subtle bg-info-bg px-4 py-3">
              <p class="text-sm text-info-fg">
                <span
                  class="i-tabler-info-circle mr-2 inline-block size-4 align-text-bottom"
                  aria-hidden="true"
                />
                Cursus ne collecte aucune donnée sensible au sens de l'article 9 du RGPD (opinions
                politiques, données de santé, données biométriques, etc.).
              </p>
            </div>
          </section>

          <!-- 3. Base légale -->
          <section id="pc-3">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">
              3. Base légale des traitements
            </h2>
            <div class="overflow-x-auto rounded-lg border border-border-subtle">
              <table class="w-full text-sm">
                <caption class="sr-only">
                  Base légale pour chaque catégorie de traitement.
                </caption>
                <thead class="bg-muted">
                  <tr>
                    <th scope="col" class="px-4 py-3 text-left font-semibold text-text-strong">
                      Traitement
                    </th>
                    <th scope="col" class="px-4 py-3 text-left font-semibold text-text-strong">
                      Base légale (RGPD)
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-subtle">
                  <tr class="bg-surface transition-colors hover:bg-hover">
                    <td class="px-4 py-3 text-text-default">Gestion du compte utilisateur</td>
                    <td class="px-4 py-3 text-text-muted">Exécution du contrat (art. 6.1.b)</td>
                  </tr>
                  <tr class="bg-surface transition-colors hover:bg-hover">
                    <td class="px-4 py-3 text-text-default">Validation des livrables</td>
                    <td class="px-4 py-3 text-text-muted">Exécution du contrat (art. 6.1.b)</td>
                  </tr>
                  <tr class="bg-surface transition-colors hover:bg-hover">
                    <td class="px-4 py-3 text-text-default">Envoi de notifications</td>
                    <td class="px-4 py-3 text-text-muted">Exécution du contrat (art. 6.1.b)</td>
                  </tr>
                  <tr class="bg-surface transition-colors hover:bg-hover">
                    <td class="px-4 py-3 text-text-default">Logs de sécurité (IP hashée)</td>
                    <td class="px-4 py-3 text-text-muted">Intérêt légitime (art. 6.1.f)</td>
                  </tr>
                  <tr class="bg-surface transition-colors hover:bg-hover">
                    <td class="px-4 py-3 text-text-default">Génération de certificats</td>
                    <td class="px-4 py-3 text-text-muted">Exécution du contrat (art. 6.1.b)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- 4. Durée de conservation -->
          <section id="pc-4">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">4. Durée de conservation</h2>
            <ul class="list-disc space-y-2 pl-6">
              <li>
                <strong class="text-text-strong">Données de compte actif :</strong>
                conservées pendant toute la durée de la relation contractuelle.
              </li>
              <li>
                <strong class="text-text-strong">Après suppression du compte :</strong>
                suppression définitive des données personnelles sous 30 jours, sauf obligation
                légale de conservation plus longue (notamment art. L. 123-22 Code de commerce).
              </li>
              <li>
                <strong class="text-text-strong">Logs techniques :</strong>
                conservés 12 mois maximum, conformément aux obligations légales (art. R. 10-13
                CPCE).
              </li>
              <li>
                <strong class="text-text-strong">Consentements :</strong>
                conservés 5 ans à compter de la date d'acceptation (preuve de conformité RGPD).
              </li>
            </ul>
          </section>

          <!-- 5. Droits -->
          <section id="pc-5">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">5. Droits des utilisateurs</h2>
            <p class="leading-relaxed">
              Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :
            </p>
            <ul class="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong class="text-text-strong">Droit d'accès</strong> (art. 15) : obtenir une
                copie de vos données.
              </li>
              <li>
                <strong class="text-text-strong">Droit de rectification</strong> (art. 16) :
                corriger des données inexactes.
              </li>
              <li>
                <strong class="text-text-strong">Droit à l'effacement</strong> (art. 17) : demander
                la suppression de votre compte et de vos données.
              </li>
              <li>
                <strong class="text-text-strong">Droit à la portabilité</strong> (art. 20) :
                recevoir vos données dans un format lisible par machine.
              </li>
              <li>
                <strong class="text-text-strong">Droit d'opposition</strong> (art. 21) : vous
                opposer à un traitement basé sur l'intérêt légitime.
              </li>
              <li>
                <strong class="text-text-strong">Droit à la limitation</strong> (art. 18) : limiter
                le traitement dans certains cas.
              </li>
            </ul>
            <p class="mt-4 leading-relaxed">
              Pour exercer ces droits, contactez :
              <a
                href="mailto:privacy@cursus.app"
                class="font-medium text-accent-text underline-offset-2 hover:underline"
              >
                privacy@cursus.app </a
              >. Nous répondrons dans un délai d'un mois (art. 12 RGPD).
            </p>
            <p class="mt-3 leading-relaxed">
              En cas de réponse insatisfaisante, vous pouvez introduire une réclamation auprès de la
              <strong>CNIL</strong> (
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-accent-text underline-offset-2 hover:underline"
              >
                www.cnil.fr
              </a>
              ).
            </p>
          </section>

          <!-- 6. Cookies -->
          <section id="pc-6">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">6. Cookies</h2>
            <p class="leading-relaxed">
              Cursus utilise uniquement des cookies essentiels au fonctionnement du service. Aucun
              cookie de tracking publicitaire n'est déposé.
            </p>
            <p class="mt-3">
              <NuxtLink
                to="/legal/cookies"
                class="font-medium text-accent-text underline-offset-2 hover:underline"
              >
                Consulter la politique des cookies complète
                <span
                  class="i-tabler-arrow-right ml-1 inline-block size-4 align-text-bottom"
                  aria-hidden="true"
                />
              </NuxtLink>
            </p>
          </section>

          <!-- 7. Transferts hors UE -->
          <section id="pc-7">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">
              7. Transfert hors Union européenne
            </h2>
            <p class="leading-relaxed">
              Les données personnelles sont hébergées par <strong>Supabase Inc.</strong> sur des
              serveurs situés en Europe (région <em>Frankfurt — eu-central-1</em>). Aucun transfert
              vers des pays tiers n'est effectué hors du cadre d'un accord de traitement des données
              (DPA) conforme au Chapitre V du RGPD.
            </p>
            <p class="mt-3 leading-relaxed">
              Le DPA Supabase est disponible sur demande à
              <a
                href="mailto:privacy@cursus.app"
                class="font-medium text-accent-text underline-offset-2 hover:underline"
              >
                privacy@cursus.app </a
              >.
            </p>
          </section>
        </div>

        <!-- Footer légal -->
        <footer class="mt-12 border-t border-border-subtle pt-6">
          <p class="text-sm text-text-muted">
            Voir aussi :
            <NuxtLink
              to="/legal/cgu"
              class="font-medium text-accent-text underline-offset-2 hover:underline"
            >
              Conditions Générales d'Utilisation
            </NuxtLink>
            ·
            <NuxtLink
              to="/legal/cookies"
              class="font-medium text-accent-text underline-offset-2 hover:underline"
            >
              Politique des cookies
            </NuxtLink>
          </p>
        </footer>
      </article>
    </div>
  </div>
</template>
