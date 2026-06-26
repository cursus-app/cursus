<script setup lang="ts">
/**
 * AppEmptyState — molecule état vide avec illustration SVG, titre, description et CTA.
 *
 * Différences avec l'atome CEmptyState :
 *   - Illustration SVG inline (pas une icône Tabler)
 *   - CTA via UButton (actionLabel prop + `action` emit)
 *   - Slot `action` pour cas personnalisés
 *
 * Accessibilité :
 *   - L'illustration a un titre SVG (alt textuel équivalent)
 *   - aria-hidden sur le conteneur SVG si un titre alt est fourni
 */

interface Props {
  /** Titre court. */
  title: string;
  /** Description empathique. */
  description?: string;
  /** Texte alternatif de l'illustration SVG. */
  illustrationAlt?: string;
  /** Libellé de l'action principale (CTA). */
  actionLabel?: string;
  /** Icône Tabler du CTA. */
  actionIcon?: string;
  /** Icône Tabler à la place de l'illustration SVG (mode simplifié). */
  icon?: string;
  /** Classe(s) CSS supplémentaires. */
  class?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{ action: [] }>();

/** Identifiant unique pour le titre SVG (accessibilité). */
const svgTitleId = `empty-state-title-${Math.random().toString(36).slice(2, 9)}`;
</script>

<template>
  <div
    :class="['flex flex-col items-center justify-center gap-4 py-16 text-center', props.class]"
  >
    <!-- Illustration SVG (inline, accessible) -->
    <div
      v-if="!props.icon"
      aria-hidden="true"
      class="mb-2"
    >
      <svg
        :aria-labelledby="props.illustrationAlt ? svgTitleId : undefined"
        :aria-hidden="!props.illustrationAlt"
        role="img"
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title v-if="props.illustrationAlt" :id="svgTitleId">{{ props.illustrationAlt }}</title>
        <!-- Illustration générique : boîte vide -->
        <rect
          x="20"
          y="40"
          width="80"
          height="60"
          rx="6"
          class="fill-muted stroke-border-default"
          stroke-width="2"
        />
        <path
          d="M20 58 L42 58 L50 72 L70 72 L78 58 L100 58"
          class="stroke-border-default"
          stroke-width="2"
          fill="none"
        />
        <path
          d="M45 30 L75 30"
          class="stroke-border-subtle"
          stroke-width="2"
          stroke-linecap="round"
        />
        <path
          d="M50 22 L70 22"
          class="stroke-border-subtle"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle cx="60" cy="65" r="8" class="fill-subtle stroke-border-default" stroke-width="1.5" />
        <path
          d="M56 65 L58.5 67.5 L64 62"
          class="stroke-text-muted"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      </svg>
    </div>

    <!-- Icône Tabler (mode simplifié) -->
    <div
      v-else
      :class="[props.icon, 'size-12 text-text-muted']"
      aria-hidden="true"
    />

    <!-- Textes -->
    <div class="max-w-sm">
      <p class="text-base font-semibold text-text-strong">{{ props.title }}</p>
      <p v-if="props.description" class="mt-1.5 text-sm text-text-muted">
        {{ props.description }}
      </p>
    </div>

    <!-- CTA -->
    <UButton
      v-if="props.actionLabel"
      :leading-icon="props.actionIcon"
      color="primary"
      variant="solid"
      @click="emit('action')"
    >
      {{ props.actionLabel }}
    </UButton>

    <!-- Slot pour actions personnalisées -->
    <slot name="action" />
  </div>
</template>
