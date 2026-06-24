<script setup lang="ts">
/**
 * Indicateur de force de mot de passe — 5 critères visuels.
 * Accessible : annoncé via aria-live="polite" pour les lecteurs d'écran.
 * Tokens design uniquement : text-success-fg / text-danger-fg.
 */
interface Props {
  password: string;
}

const props = defineProps<Props>();

const { t } = useI18n();

const criteria = computed(() => [
  {
    key: 'length',
    label: t('auth.passwordStrength.length'),
    valid: props.password.length >= 12,
  },
  {
    key: 'uppercase',
    label: t('auth.passwordStrength.uppercase'),
    valid: /[A-Z]/.test(props.password),
  },
  {
    key: 'lowercase',
    label: t('auth.passwordStrength.lowercase'),
    valid: /[a-z]/.test(props.password),
  },
  {
    key: 'digit',
    label: t('auth.passwordStrength.digit'),
    valid: /[0-9]/.test(props.password),
  },
  {
    key: 'symbol',
    label: t('auth.passwordStrength.symbol'),
    valid: /[^A-Za-z0-9]/.test(props.password),
  },
]);

const allValid = computed(() => criteria.value.every((c) => c.valid));

// Annonce synthétique pour les lecteurs d'écran — mise à jour quand tous les
// critères sont remplis (evite le bruit d'une annonce par frappe).
const ariaAnnounce = computed(() => (allValid.value ? t('auth.passwordStrength.allValid') : ''));
</script>

<template>
  <div
    aria-live="polite"
    aria-atomic="true"
    class="mt-3 space-y-1.5"
    data-testid="password-strength-indicator"
  >
    <!-- Message lu uniquement par les lecteurs d'écran quand tout est valide -->
    <span class="sr-only">{{ ariaAnnounce }}</span>

    <div v-for="criterion in criteria" :key="criterion.key" class="flex items-center gap-2 text-sm">
      <UIcon
        :name="criterion.valid ? 'i-tabler-check' : 'i-tabler-x'"
        class="size-4 shrink-0"
        :class="criterion.valid ? 'text-success-fg' : 'text-danger-fg'"
        :aria-label="
          criterion.valid
            ? t('auth.passwordStrength.criterionMet')
            : t('auth.passwordStrength.criterionNotMet')
        "
      />
      <span :class="criterion.valid ? 'text-success-fg' : 'text-text-muted'">
        {{ criterion.label }}
      </span>
    </div>
  </div>
</template>
