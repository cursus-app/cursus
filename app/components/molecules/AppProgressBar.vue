<script setup lang="ts">
/**
 * AppProgressBar — wrapper UProgress (@nuxt/ui) pour barre de progression.
 *
 * Supporte deux modes :
 *   - linear  : barre horizontale (défaut)
 *   - circular : cercle SVG (passe size en pixels)
 *
 * Accessibilité :
 *   - role="progressbar" + aria-valuenow + aria-valuemin + aria-valuemax
 *   - Label i18n via aria-label (ex : "Progression : 45 %")
 */

type ProgressSize = 'sm' | 'md' | 'lg';
type ProgressType = 'linear' | 'circular';

interface Props {
  /** Valeur courante (0 → max). */
  value?: number;
  /** Valeur maximale. */
  max?: number;
  /** Mode de rendu. */
  type?: ProgressType;
  /** Taille (sm/md/lg). */
  size?: ProgressSize;
  /** Affiche la valeur en texte (ex : "45 %"). */
  showValue?: boolean;
  /** Libellé accessible. Si absent, utilise le template i18n. */
  label?: string | null;
  /** Animation indéterminée (value non fournie = loading). */
  indeterminate?: boolean;
  /** Classe(s) CSS supplémentaires. */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: 0,
  max: 100,
  type: 'linear',
  size: 'md',
  showValue: false,
  label: null,
  indeterminate: false,
  class: '',
});

const { t } = useI18n();

const percent = computed(() => {
  if (props.indeterminate) {
    return null;
  }
  return Math.round((props.value / props.max) * 100);
});

const ariaLabel = computed(() =>
  props.label ?? (percent.value !== null
    ? t('molecules.progressBar.progress', { value: percent.value })
    : t('common.loading')),
);

/** Hauteur de la barre selon la taille. */
const heightClasses: Record<ProgressSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

/** Taille du cercle SVG selon la taille. */
const circularSize: Record<ProgressSize, number> = {
  sm: 48,
  md: 64,
  lg: 80,
};

const svgSize = computed(() => circularSize[props.size]);
const radius = computed(() => (svgSize.value - 8) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const strokeDashoffset = computed(() => {
  if (props.indeterminate || percent.value === null) {
    return 0;
  }
  return circumference.value * (1 - percent.value / 100);
});
</script>

<template>
  <!-- Mode LINEAR -->
  <div
    v-if="props.type === 'linear'"
    :class="['w-full', props.class]"
  >
    <div
      role="progressbar"
      :aria-valuenow="props.indeterminate ? undefined : props.value"
      aria-valuemin="0"
      :aria-valuemax="props.max"
      :aria-label="ariaLabel"
      :class="['w-full overflow-hidden rounded-full bg-muted', heightClasses[props.size]]"
    >
      <div
        :class="[
          'h-full rounded-full bg-accent transition-all duration-300',
          props.indeterminate ? 'w-1/3 animate-pulse' : '',
        ]"
        :style="!props.indeterminate ? { width: `${percent}%` } : {}"
      />
    </div>
    <p
      v-if="props.showValue && percent !== null"
      class="mt-1 text-right text-xs text-text-muted"
      aria-hidden="true"
    >
      {{ percent }} %
    </p>
  </div>

  <!-- Mode CIRCULAR -->
  <div
    v-else
    :class="['inline-flex flex-col items-center gap-1', props.class]"
  >
    <svg
      :width="svgSize"
      :height="svgSize"
      role="progressbar"
      :aria-valuenow="props.indeterminate ? undefined : props.value"
      aria-valuemin="0"
      :aria-valuemax="props.max"
      :aria-label="ariaLabel"
    >
      <!-- Piste de fond -->
      <circle
        :cx="svgSize / 2"
        :cy="svgSize / 2"
        :r="radius"
        fill="none"
        stroke-width="4"
        class="stroke-muted"
      />
      <!-- Arc de progression -->
      <circle
        :cx="svgSize / 2"
        :cy="svgSize / 2"
        :r="radius"
        fill="none"
        stroke-width="4"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeDashoffset"
        stroke-linecap="round"
        class="stroke-accent transition-all duration-300"
        transform-origin="center"
        style="transform: rotate(-90deg)"
        :class="props.indeterminate ? 'animate-spin' : ''"
      />
      <!-- Valeur centrale -->
      <text
        v-if="props.showValue && percent !== null"
        :x="svgSize / 2"
        :y="svgSize / 2 + 5"
        text-anchor="middle"
        class="fill-text-strong text-xs font-medium"
        aria-hidden="true"
      >
        {{ percent }}%
      </text>
    </svg>
  </div>
</template>
