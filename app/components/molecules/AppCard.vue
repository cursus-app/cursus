<script setup lang="ts">
/**
 * AppCard — molecule wrapper autour de UCard (@nuxt/ui).
 *
 * Expose trois slots nommés : header, default (body), footer.
 * Si aucun slot n'a de contenu, le composant ne rend rien (évite les divs vides).
 * Design tokens : bg-surface, border-border-subtle, shadow-sm.
 */

interface Props {
  /** Taille du padding interne. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Affiche ou non l'ombre portée. */
  shadow?: boolean;
  /** Classe(s) CSS supplémentaires. */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  padding: 'md',
  shadow: true,
  class: '',
});

const slots = useSlots();

/** On ne rend le composant que si au moins un slot est alimenté. */
const hasContent = computed(
  () => !!(slots['header'] || slots['default'] || slots['footer']),
);

const paddingClasses: Record<NonNullable<Props['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
};
</script>

<template>
  <div
    v-if="hasContent"
    :class="[
      'rounded-xl border border-border-subtle bg-surface',
      props.shadow ? 'shadow-sm' : '',
      props.class,
    ]"
  >
    <div
      v-if="slots['header']"
      :class="['border-b border-border-subtle', paddingClasses[props.padding]]"
    >
      <slot name="header" />
    </div>

    <div
      v-if="slots['default']"
      :class="paddingClasses[props.padding]"
    >
      <slot />
    </div>

    <div
      v-if="slots['footer']"
      :class="['border-t border-border-subtle', paddingClasses[props.padding]]"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
