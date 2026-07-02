<script setup lang="ts">
/**
 * Page /cohortes/:cohorteId/stagiaires/:stagiaireId — fiche stagiaire 360.
 *
 * Vue complète d'un stagiaire pour les formateurs : entête KPIs, timeline chronologique,
 * panneau d'actions (override, planifier appel, marquer alerte traitée).
 *
 * Guard : middleware 'auth' + vérification côté client (formateur de la cohorte).
 *
 * Cf. ST-13.3 — TT-13.3.1
 */
import type { AlertEventData } from '~~/shared/types/timeline';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useSeoMeta({ title: 'Fiche stagiaire — Cursus' });

const route = useRoute();
const { isFormateur, isAdmin } = usePermission();

// ── Paramètres de route ───────────────────────────────────────────────────────

const cohorteId = computed(() => {
  const raw = route.params['cohorteId'];
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
});

const stagiaireId = computed(() => {
  const raw = route.params['stagiaireId'];
  return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '');
});

// ── Guard formateur (côté client) ────────────────────────────────────────────
// La vérification serveur reste la source de vérité (endpoints 403).

const hasAccess = computed(() => isAdmin() || isFormateur());

onMounted(() => {
  if (!hasAccess.value) {
    void navigateTo(`/cohortes/${cohorteId.value}`);
  }
});

// ── Timeline ──────────────────────────────────────────────────────────────────

const {
  events,
  nextCursor,
  loading: timelineLoading,
  error: timelineError,
  activeFilters,
  fetchPage,
  loadMore,
} = useStagiaireTimeline(stagiaireId, cohorteId);

// Charger la première page au montage
onMounted(() => {
  if (hasAccess.value && stagiaireId.value && cohorteId.value) {
    void fetchPage();
  }
});

// ── Alertes actives (dérivées de la timeline) ────────────────────────────────

const activeAlertsCount = computed(() => {
  return events.value.filter((e) => e.type === 'alert' && !(e.data as AlertEventData).resolvedAt)
    .length;
});

// ── Recharger la timeline après un override ───────────────────────────────────

function handleOverrideDone(): void {
  void fetchPage();
}

function handleAlertResolved(): void {
  void fetchPage();
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <!-- Accès non autorisé (fallback visuel pendant la redirection) -->
    <div
      v-if="!hasAccess"
      class="flex items-center gap-2 rounded-lg border border-border-subtle bg-danger-bg p-4 text-sm text-danger-fg"
    >
      <UIcon name="i-tabler-lock" class="size-4 shrink-0" aria-hidden="true" />
      <span>Accès réservé aux formateurs de cette cohorte.</span>
    </div>

    <template v-else>
      <!-- Erreur timeline générale -->
      <div
        v-if="timelineError"
        class="mb-4 flex items-center gap-2 rounded-lg border border-border-subtle bg-danger-bg p-3 text-sm text-danger-fg"
      >
        <UIcon name="i-tabler-alert-triangle" class="size-4 shrink-0" aria-hidden="true" />
        <span>Impossible de charger la timeline. Veuillez rafraîchir la page.</span>
      </div>

      <!-- Grille deux colonnes (lg: left large / right sticky) -->
      <div class="grid gap-6 lg:grid-cols-[1fr,320px]">
        <!-- Colonne gauche : entête + timeline -->
        <div class="min-w-0 space-y-6">
          <!-- En-tête avec KPIs -->
          <StagiaireHeader :stagiaire-id="stagiaireId" :cohorte-id="cohorteId" />

          <!-- Timeline unifiée -->
          <StagiaireTimeline
            :events="events"
            :loading="timelineLoading"
            :has-more="nextCursor !== null"
            :active-filters="activeFilters"
            @load-more="loadMore"
            @update:active-filters="activeFilters = $event"
          />
        </div>

        <!-- Colonne droite : panneau d'actions (sticky sur desktop) -->
        <div class="lg:sticky lg:top-20 lg:self-start">
          <ActionPanel
            :stagiaire-id="stagiaireId"
            :cohorte-id="cohorteId"
            :active-alerts="activeAlertsCount"
            @override-done="handleOverrideDone"
            @alert-resolved="handleAlertResolved"
          />
        </div>
      </div>
    </template>
  </div>
</template>
