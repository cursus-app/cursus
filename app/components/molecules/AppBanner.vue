<script setup lang="ts">
/**
 * AppBanner — bandeau top-of-page dismissible persisté via localStorage.
 *
 * Logique :
 *   - À l'init, lit localStorage[`banner-dismissed-${id}`] pour savoir si
 *     l'utilisateur a déjà fermé ce banner.
 *   - On dismiss : écrit la clé + masque le banner.
 *   - `id` doit être unique par banner pour permettre plusieurs banners distincts.
 *
 * Accessibilité :
 *   - role="banner" sur la balise <header> native (pas <div>)
 *   - aria-label décrit le contenu
 *   - Bouton de fermeture avec aria-label i18n
 *
 * Animation :
 *   - Transition slide-down à l'apparition
 *   - prefers-reduced-motion : supprimé par le reset global main.css
 */

type BannerVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

interface Props {
  /** Identifiant unique utilisé pour la clé localStorage. */
  id: string;
  /** Variant sémantique du bandeau. */
  variant?: BannerVariant;
  /** Contenu textuel principal. */
  message: string;
  /** Affiche le bouton de fermeture. */
  dismissible?: boolean;
  /** Classe(s) CSS supplémentaires. */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  dismissible: true,
  class: '',
});

const emit = defineEmits<{ dismiss: [] }>();

const { t } = useI18n();

const storageKey = computed(() => `banner-dismissed-${props.id}`);

/** Visible si pas encore dismissé. SSR-safe : on ne lit localStorage qu'après mount. */
const visible = ref(false);

onMounted(() => {
  if (typeof localStorage !== 'undefined') {
    visible.value = localStorage.getItem(storageKey.value) !== '1';
  } else {
    visible.value = true;
  }
});

function dismiss() {
  visible.value = false;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey.value, '1');
  }
  emit('dismiss');
}

const variantClasses: Record<BannerVariant, string> = {
  info: 'bg-info-bg text-info-fg border-info-fg/20',
  success: 'bg-success-bg text-success-fg border-success-fg/20',
  warning: 'bg-warning-bg text-warning-fg border-warning-fg/20',
  danger: 'bg-danger-bg text-danger-fg border-danger-fg/20',
  neutral: 'bg-muted text-text-default border-border-subtle',
};

const variantIcons: Record<BannerVariant, string> = {
  info: 'i-tabler-info-circle',
  success: 'i-tabler-circle-check',
  warning: 'i-tabler-alert-triangle',
  danger: 'i-tabler-circle-x',
  neutral: 'i-tabler-bell',
};
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <header
      v-if="visible"
      role="banner"
      :aria-label="props.message"
      :class="['w-full border-b px-4 py-2.5', variantClasses[props.variant], props.class]"
    >
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-sm">
          <span :class="[variantIcons[props.variant], 'size-4 shrink-0']" aria-hidden="true" />
          <span>{{ props.message }}</span>
          <slot />
        </div>

        <button
          v-if="props.dismissible"
          type="button"
          :aria-label="t('molecules.banner.dismiss')"
          class="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="dismiss"
        >
          <span class="i-tabler-x size-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  </Transition>
</template>
