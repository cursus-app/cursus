<script setup lang="ts">
// Page interstitielle affichée après inscription réussie.
// L'utilisateur doit confirmer son email avant de pouvoir se connecter.
definePageMeta({
  layout: 'auth',
});

const { t } = useI18n();

useSeoMeta({
  title: t('auth.checkEmailTitle'),
  robots: 'noindex',
});
</script>

<template>
  <div class="text-center">
    <div
      class="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-accent-subtle"
    >
      <UIcon name="i-tabler-mail" class="size-8 text-accent" />
    </div>

    <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
      {{ t('auth.checkEmailTitle') }}
    </h1>
    <p class="mt-3 text-sm leading-relaxed text-text-muted">
      {{ t('auth.checkEmailDescription') }}
    </p>

    <div class="mt-8 rounded-lg border border-border-subtle bg-subtle p-4 text-sm text-text-muted">
      <p>{{ t('auth.checkEmailSpam') }}</p>
    </div>

    <div class="mt-6">
      <NuxtLink
        to="/login"
        class="text-sm text-accent-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {{ t('auth.backToLogin') }}
      </NuxtLink>
    </div>
  </div>
</template>
