<script setup lang="ts">
/**
 * LanguageSwitcher — bouton dropdown pour basculer entre FR et EN.
 *
 * - Persiste la préférence dans le cookie `i18n_redirected` (géré par @nuxtjs/i18n).
 * - Locale active affichée en toutes lettres (« FR » / « EN »).
 * - Icône i-tabler-language pour l'identification visuelle.
 * - Accessible : aria-label, aria-haspopup, aria-expanded.
 */

import type { SupportedLocale } from '~/composables/useAppI18n';

const { locale, localeOptions, switchLocale } = useAppI18n();

/**
 * Items pour UDropdownMenu — un item par locale.
 * Le type générique est inféré depuis @nuxt/ui.
 */
const items = computed(() =>
  localeOptions.value.map((option) => ({
    label: option.name,
    value: option.code,
    icon: option.code === locale.value ? 'i-tabler-check' : undefined,
    class: option.code === locale.value ? 'font-medium text-text-strong' : 'text-text-default',
    onSelect: () => void handleSelect(option.code),
  })),
);

async function handleSelect(code: SupportedLocale): Promise<void> {
  await switchLocale(code);
}

/** Label affiché sur le bouton (code en majuscule) */
const buttonLabel = computed(() => locale.value.toUpperCase());
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end', side: 'bottom' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      size="sm"
      icon="i-tabler-language"
      :trailing-icon="'i-tabler-chevron-down'"
      :aria-label="`${buttonLabel} — changer de langue / change language`"
    >
      {{ buttonLabel }}
    </UButton>
  </UDropdownMenu>
</template>
