<script setup lang="ts">
/**
 * BadgeCard — ST-11.2 TT-11.2.4
 *
 * Carte d'un badge : verrouillée (grisée) ou débloquée (colorée).
 * Déclenche une animation card-flip GPU-accelerated au déblocage.
 * Respecte prefers-reduced-motion via le préfixe Tailwind `motion-safe:`.
 * Annonce le déblocage aux lecteurs d'écran via aria-live="assertive".
 */

const props = defineProps<{
  /** Slug / code du badge (utilisé comme key externe). */
  slug: string;
  name: string;
  description: string;
  /** Nom d'icône Tabler outline, ex: 'i-tabler-rocket'. */
  icon: string;
  /** true = badge obtenu, false = badge verrouillé. */
  unlocked: boolean;
  /** ISO string de la date d'attribution (affichage optionnel). */
  grantedAt?: string | null;
  /** Mention écrite par le formateur (attribution manuelle). */
  mention?: string | null;
}>();

const { t } = useI18n();

// ── Animation de révélation ──────────────────────────────────────────────────

const isRevealing = ref(false);
let revealTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.unlocked,
  (val, old) => {
    if (val && !old) {
      isRevealing.value = true;
      revealTimer = setTimeout(() => {
        isRevealing.value = false;
        revealTimer = null;
      }, 700);
    }
  },
);

onUnmounted(() => {
  if (revealTimer !== null) {
    clearTimeout(revealTimer);
  }
});
</script>

<template>
  <div
    :class="[
      'relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all',
      unlocked
        ? 'border-border-subtle bg-surface text-text-strong'
        : 'border-border-subtle bg-muted text-text-muted opacity-50',
      isRevealing && 'motion-safe:animate-card-flip',
    ]"
    :aria-label="unlocked ? t('badge.unlockedLabel', { name }) : t('badge.lockedLabel', { name })"
    role="img"
  >
    <UIcon
      :name="unlocked ? icon : 'i-tabler-lock'"
      :class="['size-8', unlocked ? 'text-accent' : 'text-text-subtle']"
      aria-hidden="true"
    />
    <span class="text-sm font-semibold">{{ name }}</span>
    <span class="text-center text-xs text-text-muted">{{ description }}</span>
    <span v-if="mention" class="text-xs text-text-subtle italic">{{ mention }}</span>

    <!-- Annonce live pour les lecteurs d'écran lors du déblocage -->
    <span v-if="isRevealing" role="status" aria-live="assertive" class="sr-only">
      {{ t('badge.unlocked', { name }) }}
    </span>
  </div>
</template>
