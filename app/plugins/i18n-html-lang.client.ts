// Synchronise <html lang="..."> avec la locale active — évite le FOUL
// (Flash Of Untranslated Locale) en gardant l'attribut cohérent côté client.
import { watch } from 'vue';
import { useI18n } from '#i18n';

export default defineNuxtPlugin(() => {
  const { locale } = useI18n();

  watch(
    locale,
    (newLocale) => {
      document.documentElement.lang = newLocale;
    },
    { immediate: true },
  );
});
