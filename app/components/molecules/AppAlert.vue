<script setup lang="ts">
/**
 * AppAlert — molecule alerte inline dismissible.
 *
 * Wraps UAlert (@nuxt/ui) avec variants sémantiques du design system :
 *   success → bg-success-bg / text-success-fg
 *   warning → bg-warning-bg / text-warning-fg
 *   danger  → bg-danger-bg  / text-danger-fg
 *   info    → bg-info-bg    / text-info-fg
 *
 * Accessibilité :
 *   - role="alert" (ou status pour success/info) via attribut natif UAlert
 *   - bouton de fermeture avec aria-label i18n
 */

type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

interface Props {
  /** Variant sémantique. */
  variant?: AlertVariant;
  /** Titre de l'alerte. */
  title?: string | null;
  /** Description (corps) de l'alerte. */
  description?: string | null;
  /** Icône Tabler à afficher. Si null, utilise l'icône par défaut du variant. */
  icon?: string | null;
  /** Affiche le bouton de fermeture. */
  dismissible?: boolean;
  /** Classe(s) CSS supplémentaires. */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  title: null,
  description: null,
  icon: null,
  dismissible: false,
  class: '',
});

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();

const visible = ref(true);

function dismiss() {
  visible.value = false;
  emit('close');
}

/** Icônes par défaut par variant. */
const defaultIcons: Record<AlertVariant, string> = {
  success: 'i-tabler-circle-check',
  warning: 'i-tabler-alert-triangle',
  danger: 'i-tabler-circle-x',
  info: 'i-tabler-info-circle',
};

/** Classes de couleurs par variant (design tokens uniquement). */
const variantClasses: Record<AlertVariant, string> = {
  success: 'bg-success-bg text-success-fg border-success-fg/20',
  warning: 'bg-warning-bg text-warning-fg border-warning-fg/20',
  danger: 'bg-danger-bg text-danger-fg border-danger-fg/20',
  info: 'bg-info-bg text-info-fg border-info-fg/20',
};

/** role ARIA : alert pour danger/warning, status pour success/info. */
const ariaRole = computed<'alert' | 'status'>(() =>
  props.variant === 'danger' || props.variant === 'warning' ? 'alert' : 'status',
);

const resolvedIcon = computed(() => props.icon ?? defaultIcons[props.variant]);
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      :role="ariaRole"
      :class="[
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        variantClasses[props.variant],
        props.class,
      ]"
    >
      <!-- Icône -->
      <span :class="[resolvedIcon, 'mt-0.5 size-4 shrink-0']" aria-hidden="true" />

      <!-- Contenu -->
      <div class="min-w-0 flex-1">
        <p v-if="props.title" class="font-medium">{{ props.title }}</p>
        <p v-if="props.description" :class="props.title ? 'mt-0.5 opacity-80' : ''">
          {{ props.description }}
        </p>
        <slot />
      </div>

      <!-- Bouton fermeture -->
      <button
        v-if="props.dismissible"
        type="button"
        :aria-label="t('molecules.alert.dismiss')"
        class="ml-auto shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        @click="dismiss"
      >
        <span class="i-tabler-x size-4" aria-hidden="true" />
      </button>
    </div>
  </Transition>
</template>
