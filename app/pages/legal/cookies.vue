<script setup lang="ts">
/**
 * /legal/cookies — ST-15.5
 *
 * Page de politique d'utilisation des cookies.
 * Liste exhaustive des cookies essentiels de Cursus conformément
 * à l'article 82 de la loi Informatique et Libertés et à la doctrine CNIL.
 */
useHead({
  title: 'Politique des cookies',
  meta: [
    {
      name: 'description',
      content:
        'Cursus utilise uniquement des cookies essentiels. Découvrez leur liste complète, leur durée et leur base légale.',
    },
    { name: 'robots', content: 'index, follow' },
  ],
});

interface CookieEntry {
  name: string;
  duration: string;
  purpose: string;
  legalBasis: string;
}

const cookies: CookieEntry[] = [
  {
    name: 'cursus.session',
    duration: '30 jours',
    purpose: 'Auth / session active',
    legalBasis: 'Exécution du contrat (art. 6.1.b RGPD)',
  },
  {
    name: 'cursus.csrf',
    duration: 'Session',
    purpose: 'Protection contre les attaques CSRF',
    legalBasis: 'Intérêt légitime (art. 6.1.f RGPD)',
  },
  {
    name: 'cursus.lang',
    duration: '1 an',
    purpose: 'Mémoriser la langue choisie',
    legalBasis: 'Intérêt légitime (art. 6.1.f RGPD)',
  },
  {
    name: 'cursus.theme',
    duration: '1 an',
    purpose: 'Mémoriser le thème (clair / sombre)',
    legalBasis: 'Intérêt légitime (art. 6.1.f RGPD)',
  },
  {
    name: 'cursus.cookie_notice_seen',
    duration: '1 an',
    purpose: "Éviter de réafficher le bandeau d'information cookies",
    legalBasis: 'Intérêt légitime (art. 6.1.f RGPD)',
  },
  {
    name: 'i18n_redirected',
    duration: '1 an',
    purpose: 'Redirection i18n automatique',
    legalBasis: 'Intérêt légitime (art. 6.1.f RGPD)',
  },
];
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
            <span class="text-text-default" aria-current="page">Politique des cookies</span>
          </li>
        </ol>
      </nav>

      <article>
        <header class="mb-10">
          <h1 class="text-3xl font-semibold tracking-tight text-text-strong">
            Politique des cookies
          </h1>
          <p class="mt-2 text-sm text-text-muted">Dernière mise à jour : 24 juin 2026</p>
        </header>

        <!-- Introduction -->
        <section class="mb-10 space-y-4">
          <h2 class="text-xl font-semibold text-text-strong">Notre approche</h2>
          <p class="leading-relaxed text-text-default">
            Cursus utilise <strong>uniquement des cookies essentiels</strong> au fonctionnement du
            service. Ces cookies sont strictement nécessaires à la navigation et à
            l'authentification ; ils ne peuvent pas être refusés sans altérer le service.
          </p>
          <p class="leading-relaxed text-text-default">
            Nous n'utilisons aucun cookie de tracking publicitaire ni de profilage. Notre outil
            d'analyse d'audience, <strong>Plausible Analytics</strong>, fonctionne en mode
            <em>cookie-less</em> : aucune donnée personnelle n'est collectée à des fins analytiques.
          </p>
        </section>

        <!-- Tableau des cookies -->
        <section class="mb-10">
          <h2 class="mb-4 text-xl font-semibold text-text-strong">Liste des cookies déposés</h2>

          <div class="overflow-x-auto rounded-lg border border-border-subtle">
            <table class="w-full min-w-[640px] text-sm">
              <caption class="sr-only">
                Liste exhaustive des cookies essentiels de Cursus : nom, durée, finalité et base
                légale RGPD.
              </caption>
              <thead class="bg-muted">
                <tr>
                  <th scope="col" class="px-4 py-3 text-left font-semibold text-text-strong">
                    Nom du cookie
                  </th>
                  <th scope="col" class="px-4 py-3 text-left font-semibold text-text-strong">
                    Durée
                  </th>
                  <th scope="col" class="px-4 py-3 text-left font-semibold text-text-strong">
                    Finalité
                  </th>
                  <th scope="col" class="px-4 py-3 text-left font-semibold text-text-strong">
                    Base légale
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-subtle">
                <tr
                  v-for="c in cookies"
                  :key="c.name"
                  class="bg-surface transition-colors hover:bg-hover"
                >
                  <td class="px-4 py-3 font-mono text-xs text-text-default">
                    {{ c.name }}
                  </td>
                  <td class="px-4 py-3 text-text-default">
                    {{ c.duration }}
                  </td>
                  <td class="px-4 py-3 text-text-default">
                    {{ c.purpose }}
                  </td>
                  <td class="px-4 py-3 text-text-muted">
                    {{ c.legalBasis }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Cookies tiers -->
        <section class="mb-10 space-y-4">
          <h2 class="text-xl font-semibold text-text-strong">Cookies tiers</h2>
          <div class="rounded-lg border border-border-subtle bg-success-bg px-4 py-3">
            <p class="text-sm text-success-fg">
              <span
                class="i-tabler-shield-check mr-2 inline-block size-4 align-text-bottom"
                aria-hidden="true"
              />
              <strong>Aucun cookie tiers n'est déposé sur ce site.</strong>
              Plausible Analytics est configuré en mode cookie-less : aucune donnée personnelle
              n'est transmise à des tiers à des fins analytiques ou publicitaires.
            </p>
          </div>
        </section>

        <!-- Contact -->
        <section class="space-y-4">
          <h2 class="text-xl font-semibold text-text-strong">Contact</h2>
          <p class="leading-relaxed text-text-default">
            Pour toute question relative à l'utilisation des cookies ou à la protection de vos
            données, vous pouvez contacter notre DPO à l'adresse :
            <a
              href="mailto:privacy@cursus.app"
              class="font-medium text-accent-text underline-offset-2 hover:underline"
            >
              privacy@cursus.app
            </a>
          </p>
          <p class="text-sm text-text-muted">
            Pour en savoir plus sur vos droits, consultez notre
            <NuxtLink
              to="/legal/privacy"
              class="font-medium text-accent-text underline-offset-2 hover:underline"
            >
              Politique de confidentialité
            </NuxtLink>
            et nos
            <NuxtLink
              to="/legal/cgu"
              class="font-medium text-accent-text underline-offset-2 hover:underline"
            >
              Conditions Générales d'Utilisation </NuxtLink
            >.
          </p>
        </section>
      </article>
    </div>
  </div>
</template>
