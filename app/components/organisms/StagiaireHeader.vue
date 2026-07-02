<script setup lang="ts">
/**
 * StagiaireHeader — entête de la fiche stagiaire 360.
 *
 * Affiche : avatar, nom, email, badge désactivé, KPIs (% cursus, alertes, dernière activité).
 * Bouton retour vers la heatmap de la cohorte.
 *
 * Cf. ST-13.3 — TT-13.3.2
 */
import type { StagiaireProfile } from '~~/shared/types/timeline';

const props = defineProps<{
  stagiaireId: string;
  cohorteId: string;
}>();

// ── Data fetching ─────────────────────────────────────────────────────────────

const {
  data: profile,
  pending,
  error,
} = useFetch<StagiaireProfile>(() => `/api/stagiaires/${props.stagiaireId}/profile`, {
  query: { cohorteId: props.cohorteId },
});

// ── Helpers d'affichage ───────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelative(iso: string | null): string {
  if (!iso) {
    return 'jamais';
  }
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    return "aujourd'hui";
  }
  if (days === 1) {
    return 'hier';
  }
  if (days < 7) {
    return `il y a ${days} j`;
  }
  if (days < 30) {
    return `il y a ${Math.floor(days / 7)} sem.`;
  }
  return formatDate(iso);
}

const isInactive = computed(() => {
  if (!profile.value?.kpis.lastActivity) {
    return true;
  }
  const diff = Date.now() - new Date(profile.value.kpis.lastActivity).getTime();
  return diff > 14 * 24 * 60 * 60 * 1000; // 14 jours
});

const avatarFallback = computed(() => {
  const name = profile.value?.fullName ?? profile.value?.email ?? '?';
  return name.charAt(0).toUpperCase();
});
</script>

<template>
  <div>
    <!-- Bouton retour -->
    <div class="mb-4">
      <UButton
        :to="`/cohortes/${cohorteId}`"
        icon="i-tabler-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
      >
        Retour à la cohorte
      </UButton>
    </div>

    <!-- Skeleton pendant le chargement -->
    <div
      v-if="pending"
      class="flex items-start gap-4 rounded-xl border border-border-subtle bg-surface p-5"
    >
      <USkeleton class="size-16 shrink-0 rounded-full" />
      <div class="flex-1 space-y-2">
        <USkeleton class="h-5 w-48 rounded" />
        <USkeleton class="h-4 w-64 rounded" />
        <div class="mt-4 flex gap-6">
          <USkeleton class="h-10 w-24 rounded" />
          <USkeleton class="h-10 w-24 rounded" />
          <USkeleton class="h-10 w-24 rounded" />
        </div>
      </div>
    </div>

    <!-- Erreur -->
    <div
      v-else-if="error"
      class="flex items-center gap-2 rounded-xl border border-border-subtle bg-danger-bg p-4 text-sm text-danger-fg"
    >
      <UIcon name="i-tabler-alert-triangle" class="size-4 shrink-0" aria-hidden="true" />
      <span>Impossible de charger le profil du stagiaire.</span>
    </div>

    <!-- Contenu chargé -->
    <div v-else-if="profile" class="rounded-xl border border-border-subtle bg-surface p-5">
      <!-- Bannière inactivité -->
      <div
        v-if="isInactive && !profile.isDisabled"
        class="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-warning-bg px-3 py-2"
      >
        <div class="flex items-center gap-2 text-sm text-warning-fg">
          <UIcon name="i-tabler-clock-pause" class="size-4 shrink-0" aria-hidden="true" />
          <span>Aucune activité depuis plus de 14 jours</span>
        </div>
      </div>

      <!-- Entête : avatar + infos -->
      <div class="flex items-start gap-4">
        <!-- Avatar -->
        <div class="relative shrink-0">
          <UAvatar
            v-bind="profile.avatarUrl ? { src: profile.avatarUrl } : {}"
            :alt="profile.fullName ?? profile.email"
            :text="avatarFallback"
            size="xl"
          />
          <!-- Indicateur alertes actives -->
          <span
            v-if="profile.kpis.activeAlerts > 0"
            class="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-danger-solid text-[10px] font-bold text-text-on-accent"
            :aria-label="`${profile.kpis.activeAlerts} alerte(s) active(s)`"
          >
            {{ profile.kpis.activeAlerts > 9 ? '9+' : profile.kpis.activeAlerts }}
          </span>
        </div>

        <!-- Nom, email, badge désactivé -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="truncate text-xl font-semibold tracking-tight text-text-strong">
              {{ profile.fullName ?? 'Nom inconnu' }}
            </h1>
            <!-- Badge désactivé -->
            <span
              v-if="profile.isDisabled"
              class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-text-muted"
            >
              <UIcon name="i-tabler-user-off" class="size-3" aria-hidden="true" />
              Désactivé
            </span>
          </div>
          <p class="mt-0.5 text-sm text-text-muted">{{ profile.email }}</p>
        </div>
      </div>

      <!-- KPIs -->
      <div
        class="mt-5 grid grid-cols-3 gap-3 border-t border-border-subtle pt-4"
        aria-label="Indicateurs personnels du stagiaire"
      >
        <!-- % Cursus -->
        <div class="text-center">
          <p class="text-2xl font-bold text-text-strong tabular-nums">
            {{ profile.kpis.cursusProgress
            }}<span class="text-base font-normal text-text-muted">%</span>
          </p>
          <p class="mt-0.5 text-xs text-text-muted">Cursus validé</p>
          <!-- Barre de progression -->
          <div
            class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            :aria-valuenow="profile.kpis.cursusProgress"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="h-full rounded-full bg-accent transition-all"
              :style="{ width: `${profile.kpis.cursusProgress}%` }"
            />
          </div>
        </div>

        <!-- Alertes actives -->
        <div class="text-center">
          <p
            class="text-2xl font-bold tabular-nums"
            :class="profile.kpis.activeAlerts > 0 ? 'text-danger-fg' : 'text-text-strong'"
          >
            {{ profile.kpis.activeAlerts }}
          </p>
          <p class="mt-0.5 text-xs text-text-muted">
            {{ profile.kpis.activeAlerts === 1 ? 'Alerte active' : 'Alertes actives' }}
          </p>
        </div>

        <!-- Dernière activité -->
        <div class="text-center">
          <p
            class="text-lg font-semibold text-text-strong"
            :title="
              profile.kpis.lastActivity
                ? new Date(profile.kpis.lastActivity).toLocaleString('fr-FR')
                : undefined
            "
          >
            {{ formatRelative(profile.kpis.lastActivity) }}
          </p>
          <p class="mt-0.5 text-xs text-text-muted">Dernière activité</p>
        </div>
      </div>
    </div>
  </div>
</template>
