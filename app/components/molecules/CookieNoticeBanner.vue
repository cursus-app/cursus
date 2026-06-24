<script setup lang="ts">
/**
 * CookieNoticeBanner — ST-15.5
 *
 * Bandeau d'information cookies conforme ePrivacy + RGPD.
 * Cursus n'utilise que des cookies essentiels : aucun consentement granulaire
 * requis, seulement une information (doctrine CNIL art. 82).
 *
 * Accessibilité :
 *  - role="region" + aria-label pour identification par les AT
 *  - Bouton OK focusable clavier, fermeture via Enter/Space
 *  - Contraste AAA garanti via tokens design system
 *
 * Animation :
 *  - Fade-in après 500 ms (anti-CLS — le banner ne décale pas le contenu
 *    car il est en position fixed)
 *  - prefers-reduced-motion : suppression de l'animation via le reset global
 *    dans assets/css/main.css (@layer base)
 */

const { isVisible, dismiss } = useCookieNotice();

/**
 * Délai d'apparition (500 ms anti-CLS).
 * On utilise un état local pour piloter l'opacité initiale.
 */
const mounted = ref(false);
onMounted(() => {
  setTimeout(() => {
    mounted.value = true;
  }, 500);
});
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isVisible && mounted"
      role="region"
      aria-label="Information sur les cookies"
      class="fixed right-0 bottom-0 left-0 z-50 border-t border-border-subtle bg-surface shadow-md"
    >
      <div
        class="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-text-default">
          Cursus utilise uniquement des cookies essentiels au fonctionnement du site (session,
          préférences). Pas de tracking publicitaire.
          <NuxtLink
            to="/legal/cookies"
            class="ml-1 font-medium text-accent-text underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            En savoir plus
          </NuxtLink>
        </p>

        <UButton
          size="sm"
          color="primary"
          variant="solid"
          aria-label="Fermer le bandeau d'information cookies"
          @click="dismiss"
        >
          OK
        </UButton>
      </div>
    </div>
  </Transition>
</template>
