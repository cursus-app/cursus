<script setup lang="ts">
/**
 * AppFormField — molecule wrapper autour de UFormField (@nuxt/ui).
 *
 * Orchestre label, input (via slot), message d'aide et message d'erreur.
 * Intégration vee-validate : accepte `error` provenant de useField().errorMessage.
 * Accessibilité :
 *   - label lié à l'input via `for` / `id` (fournis via slot scope)
 *   - aria-describedby pointe vers le bloc erreur quand présent
 *   - border danger via token --color-danger quand erreur (géré par UFormField)
 */

interface Props {
  /** Libellé du champ. */
  label?: string;
  /** Nom du champ (utilisé par vee-validate + for/id). */
  name?: string;
  /** Message d'erreur (ex : errorMessage de useField). */
  error?: string;
  /** Message d'aide sous le champ. */
  hint?: string;
  /** Marque le champ comme requis (astérisque + aria). */
  required?: boolean;
  /** Classe(s) CSS supplémentaires sur le conteneur. */
  class?: string;
}

const props = defineProps<Props>();

/**
 * On construit les props UFormField de façon conditionnelle pour respecter
 * `exactOptionalPropertyTypes` : on n'inclut pas les clés dont la valeur serait `undefined`.
 */
const formFieldProps = computed(() => {
  const p: {
    name?: string;
    label?: string;
    error?: string | boolean;
    hint?: string;
    required?: boolean;
    class: (string | undefined)[];
  } = { class: ['flex flex-col gap-1.5', props.class] };
  if (props.name !== undefined) {
    p.name = props.name;
  }
  if (props.label !== undefined) {
    p.label = props.label;
  }
  if (props.error !== undefined) {
    p.error = props.error;
  }
  if (props.hint !== undefined) {
    p.hint = props.hint;
  }
  if (props.required !== undefined) {
    p.required = props.required;
  }
  return p;
});
</script>

<template>
  <UFormField v-bind="formFieldProps">
    <slot />
  </UFormField>
</template>
