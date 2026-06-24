<script setup lang="ts">
/**
 * /legal/cgu — ST-15.3
 *
 * Conditions Générales d'Utilisation de Cursus v1.0.0.
 * Texte versionné, rendu SSR (cache HTTP long).
 * Base légale RGPD : exécution du contrat (art. 6.1.b).
 */
useHead({
  title: "Conditions Générales d'Utilisation",
  meta: [
    {
      name: 'description',
      content:
        "Conditions Générales d'Utilisation de Cursus — plateforme de gestion de parcours de stages tech.",
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
            <span class="text-text-default" aria-current="page">CGU</span>
          </li>
        </ol>
      </nav>

      <article class="prose-cursus">
        <header class="mb-10">
          <h1 class="text-3xl font-semibold tracking-tight text-text-strong">
            Conditions Générales d'Utilisation
          </h1>
          <p class="mt-2 text-sm text-text-muted">
            Version 1.0.0 — En vigueur depuis le 24 juin 2026
          </p>
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
            <li v-for="i in 7" :key="i">
              <a
                :href="`#article-${i}`"
                class="text-accent-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Article {{ i }} —
                <span v-if="i === 1">Objet</span>
                <span v-else-if="i === 2">Acceptation</span>
                <span v-else-if="i === 3">Description du service</span>
                <span v-else-if="i === 4">Données personnelles (RGPD)</span>
                <span v-else-if="i === 5">Responsabilités</span>
                <span v-else-if="i === 6">Résiliation</span>
                <span v-else-if="i === 7">Droit applicable</span>
              </a>
            </li>
          </ol>
        </nav>

        <div class="space-y-10 text-text-default">
          <!-- Art. 1 -->
          <section id="article-1">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">Article 1 — Objet</h2>
            <p class="leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de
              définir les conditions d'accès et d'utilisation de la plateforme
              <strong>Cursus</strong>
              (ci-après « le Service »), éditée par l'équipe Cursus.
            </p>
            <p class="mt-3 leading-relaxed">
              Cursus est une plateforme de gestion de parcours de stages tech permettant à des
              formateurs d'encadrer des stagiaires via un harnais de validation automatique, des
              livrables hebdomadaires et un système de certification numérique.
            </p>
          </section>

          <!-- Art. 2 -->
          <section id="article-2">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">
              Article 2 — Acceptation des conditions
            </h2>
            <p class="leading-relaxed">
              L'accès et l'utilisation du Service sont conditionnés à l'acceptation préalable et
              sans réserve des présentes CGU. Lors de la création d'un compte, l'utilisateur est
              invité à cocher une case confirmant qu'il a lu et accepté les CGU et la Politique de
              Confidentialité.
            </p>
            <p class="mt-3 leading-relaxed">
              Cette acceptation est tracée en base de données (date, version acceptée) et peut faire
              l'objet d'un audit à tout moment. En cas de mise à jour majeure des CGU, les
              utilisateurs existants seront invités à re-accepter les nouvelles conditions lors de
              leur prochaine connexion.
            </p>
          </section>

          <!-- Art. 3 -->
          <section id="article-3">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">
              Article 3 — Description du service
            </h2>
            <p class="leading-relaxed">Cursus propose les fonctionnalités suivantes :</p>
            <ul class="mt-3 list-disc space-y-1 pl-6">
              <li>
                Création et gestion de cursus de stages tech structurés en modules hebdomadaires.
              </li>
              <li>Soumission de livrables par les stagiaires (dépôts GitHub).</li>
              <li>Validation automatique des livrables via un harnais GitHub Actions.</li>
              <li>Système de quiz et de gamification (XP, badges).</li>
              <li>Génération de certificats numériques signés à l'issue du cursus.</li>
              <li>Portfolio public optionnel pour les stagiaires.</li>
            </ul>
            <p class="mt-3 leading-relaxed">
              Le Service est accessible via un navigateur web récent. Cursus se réserve le droit de
              faire évoluer les fonctionnalités du Service à tout moment, notamment pour des raisons
              techniques ou réglementaires.
            </p>
          </section>

          <!-- Art. 4 -->
          <section id="article-4">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">
              Article 4 — Données personnelles (RGPD)
            </h2>
            <p class="leading-relaxed">
              Dans le cadre de l'utilisation du Service, les données personnelles suivantes sont
              collectées et traitées :
            </p>
            <ul class="mt-3 list-disc space-y-1 pl-6">
              <li>Données d'identification : adresse e-mail, prénom, nom de famille.</li>
              <li>Données d'usage : livrables soumis, résultats du harnais, scores de quiz.</li>
              <li>Données techniques : logs anonymisés (adresse IP hashée, user-agent).</li>
            </ul>
            <p class="mt-3 leading-relaxed">
              <strong>Base légale :</strong> le traitement repose sur l'exécution du contrat conclu
              avec l'utilisateur (article 6.1.b du RGPD).
            </p>
            <p class="mt-3 leading-relaxed">
              <strong>Sous-traitant principal :</strong> Supabase Inc. (hébergement en Europe —
              Frankfurt). Un accord de traitement des données (DPA) est disponible sur demande.
            </p>
            <p class="mt-3 leading-relaxed">
              Pour l'exercice de vos droits (accès, rectification, suppression, portabilité),
              contactez notre DPO à l'adresse :
              <a
                href="mailto:privacy@cursus.app"
                class="font-medium text-accent-text underline-offset-2 hover:underline"
              >
                privacy@cursus.app
              </a>
            </p>
          </section>

          <!-- Art. 5 -->
          <section id="article-5">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">Article 5 — Responsabilités</h2>
            <p class="leading-relaxed">
              Cursus s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la
              disponibilité et la sécurité du Service. Toutefois, Cursus ne saurait être tenu
              responsable :
            </p>
            <ul class="mt-3 list-disc space-y-1 pl-6">
              <li>
                Des interruptions temporaires du Service pour maintenance ou incidents techniques.
              </li>
              <li>
                Des pertes de données résultant d'un acte malveillant ou d'un cas de force majeure.
              </li>
              <li>Du contenu des livrables soumis par les utilisateurs.</li>
            </ul>
            <p class="mt-3 leading-relaxed">
              L'utilisateur est responsable de la confidentialité de ses identifiants de connexion
              et s'engage à ne pas partager son accès à des tiers non autorisés.
            </p>
          </section>

          <!-- Art. 6 -->
          <section id="article-6">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">Article 6 — Résiliation</h2>
            <p class="leading-relaxed">
              L'utilisateur peut demander la suppression de son compte à tout moment via la section
              « Mon profil » de l'application, ou en contactant le support à
              <a
                href="mailto:support@cursus.app"
                class="font-medium text-accent-text underline-offset-2 hover:underline"
              >
                support@cursus.app </a
              >.
            </p>
            <p class="mt-3 leading-relaxed">
              La suppression du compte entraîne la suppression définitive des données personnelles
              dans un délai de 30 jours, sous réserve des obligations légales de conservation
              (notamment fiscales et comptables).
            </p>
            <p class="mt-3 leading-relaxed">
              Cursus se réserve le droit de suspendre ou de résilier l'accès au Service en cas de
              violation des présentes CGU, sans préavis ni indemnité.
            </p>
          </section>

          <!-- Art. 7 -->
          <section id="article-7">
            <h2 class="mb-4 text-xl font-semibold text-text-strong">
              Article 7 — Droit applicable et juridiction
            </h2>
            <p class="leading-relaxed">
              Les présentes CGU sont soumises au droit français. En cas de litige, et à défaut de
              résolution amiable, le Tribunal judiciaire de Paris sera seul compétent.
            </p>
            <p class="mt-3 leading-relaxed">
              La Commission Nationale de l'Informatique et des Libertés (CNIL) est l'autorité de
              contrôle compétente pour les questions relatives au traitement des données
              personnelles en France.
            </p>
          </section>
        </div>

        <!-- Footer légal -->
        <footer class="mt-12 border-t border-border-subtle pt-6">
          <p class="text-sm text-text-muted">
            Voir aussi :
            <NuxtLink
              to="/legal/privacy"
              class="font-medium text-accent-text underline-offset-2 hover:underline"
            >
              Politique de confidentialité
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
