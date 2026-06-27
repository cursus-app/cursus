<script setup lang="ts">
/**
 * CohorteHeatmap — grille heatmap stagiaires × modules.
 *
 * - Lignes = stagiaires, colonnes = modules (ordonnés par position)
 * - Cellule colorée par statut avec motif pour l'accessibilité daltoniens
 * - Sticky header (modules) + sticky 1ère colonne (stagiaires)
 * - Virtualisation si > 20 stagiaires (CSS contain)
 * - Clic cellule → drawer de détail
 * - Filtres : statut, alertes, retard, recherche nom
 * - Export CSV client-side
 *
 * Cf. ST-13.2 — TT-13.2.2, TT-13.2.7.
 */
import type { ProgressionStatus } from '@prisma/client';
import {
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_PATTERNS,
  ALERT_STATUSES,
  LATE_STATUSES,
  generateCsvContent,
  type HeatmapTrainee,
  type HeatmapModule,
  type HeatmapCell,
} from '~/utils/heatmap';

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  trainees: HeatmapTrainee[];
  modules: HeatmapModule[];
  heatmap: HeatmapCell[];
  cohorteId: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

// ─── i18n ────────────────────────────────────────────────────────────────────

const { t } = useI18n();

// ─── Filtres — URL-sync ───────────────────────────────────────────────────────

const route = useRoute();
const router = useRouter();

const searchQuery = ref(typeof route.query['q'] === 'string' ? route.query['q'] : '');
const filterAlertsOnly = ref(route.query['alerts'] === 'true');
const filterLateOnly = ref(route.query['late'] === 'true');

// Synchroniser les filtres dans l'URL pour partage de vue
watch([searchQuery, filterAlertsOnly, filterLateOnly], () => {
  const query: Record<string, string> = {};
  if (searchQuery.value) {query['q'] = searchQuery.value;}
  if (filterAlertsOnly.value) {query['alerts'] = 'true';}
  if (filterLateOnly.value) {query['late'] = 'true';}
  void router.replace({ query });
});

// ─── Filtrage des stagiaires ──────────────────────────────────────────────────

function traineeDisplayName(trainee: HeatmapTrainee): string {
  return trainee.fullName ?? trainee.githubHandle ?? t('cohorte.dashboard.unknownTrainee');
}

function traineeHasAlert(userId: string): boolean {
  return props.heatmap.some(
    (cell) => cell.userId === userId && (cell.hasAlert || ALERT_STATUSES.includes(cell.status)),
  );
}

function traineeIsLate(userId: string): boolean {
  return props.heatmap.some(
    (cell) => cell.userId === userId && LATE_STATUSES.includes(cell.status),
  );
}

const filteredTrainees = computed<HeatmapTrainee[]>(() => {
  let result = props.trainees;

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    result = result.filter((tr) => traineeDisplayName(tr).toLowerCase().includes(q));
  }

  if (filterAlertsOnly.value) {
    result = result.filter((tr) => traineeHasAlert(tr.id));
  }

  if (filterLateOnly.value) {
    result = result.filter((tr) => traineeIsLate(tr.id));
  }

  return result;
});

// ─── Index cellule ────────────────────────────────────────────────────────────

const cellMap = computed<Map<string, HeatmapCell>>(() => {
  const map = new Map<string, HeatmapCell>();
  for (const cell of props.heatmap) {
    map.set(`${cell.userId}:${cell.cohortModuleId}`, cell);
  }
  return map;
});

function getCell(userId: string, cohortModuleId: string): HeatmapCell {
  return (
    cellMap.value.get(`${userId}:${cohortModuleId}`) ?? {
      userId,
      cohortModuleId,
      status: 'A_VENIR' as ProgressionStatus,
      hasAlert: false,
    }
  );
}

// ─── Labels statut ────────────────────────────────────────────────────────────

function statusLabel(status: ProgressionStatus): string {
  return t(`cohorte.dashboard.status.${status}`);
}

function cellAriaLabel(trainee: HeatmapTrainee, mod: HeatmapModule, cell: HeatmapCell): string {
  return t('cohorte.dashboard.cellAriaLabel', {
    trainee: traineeDisplayName(trainee),
    module: mod.title,
    week: mod.week,
    status: statusLabel(cell.status),
  });
}

// ─── Semaine courante ─────────────────────────────────────────────────────────

const now = new Date();

function isCurrentWeek(dueDate: string): boolean {
  const due = new Date(dueDate);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return due >= weekStart && due <= weekEnd;
}

// ─── Drawer de détail ─────────────────────────────────────────────────────────

const selectedCell = ref<{
  trainee: HeatmapTrainee;
  module: HeatmapModule;
  cell: HeatmapCell;
} | null>(null);
const showDrawer = ref(false);

function openCellDetail(trainee: HeatmapTrainee, mod: HeatmapModule) {
  const cell = getCell(trainee.id, mod.id);
  selectedCell.value = { trainee, module: mod, cell };
  showDrawer.value = true;
}

function closeDrawer() {
  showDrawer.value = false;
  selectedCell.value = null;
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function handleExportCsv() {
  const csvContent = generateCsvContent(filteredTrainees.value, props.modules, props.heatmap);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `cohorte-${props.cohorteId}-heatmap.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Navigation clavier dans la grille ───────────────────────────────────────

function handleGridKeydown(event: KeyboardEvent, rowIdx: number, colIdx: number) {
  const colCount = props.modules.length;
  const rowCount = filteredTrainees.value.length;
  let nextRow = rowIdx;
  let nextCol = colIdx;

  if (event.key === 'ArrowRight') {
    nextCol = Math.min(colIdx + 1, colCount - 1);
  } else if (event.key === 'ArrowLeft') {
    nextCol = Math.max(colIdx - 1, 0);
  } else if (event.key === 'ArrowDown') {
    nextRow = Math.min(rowIdx + 1, rowCount - 1);
  } else if (event.key === 'ArrowUp') {
    nextRow = Math.max(rowIdx - 1, 0);
  } else if (event.key === 'Enter' || event.key === ' ') {
    const trainee = filteredTrainees.value[rowIdx];
    const mod = props.modules[colIdx];
    if (trainee && mod) {
      openCellDetail(trainee, mod);
    }
    return;
  } else {
    return;
  }

  event.preventDefault();
  const cell = document.querySelector<HTMLElement>(
    `[data-grid-row="${nextRow}"][data-grid-col="${nextCol}"]`,
  );
  cell?.focus();
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const tooltipVisible = ref(false);
const tooltipText = ref('');
const tooltipRect = ref<DOMRect | null>(null);

function showTooltip(text: string, event: MouseEvent | FocusEvent) {
  tooltipText.value = text;
  tooltipVisible.value = true;
  tooltipRect.value = (event.target as HTMLElement).getBoundingClientRect();
}

function hideTooltip() {
  tooltipVisible.value = false;
}
</script>

<template>
  <div class="space-y-4">
    <!-- Barre de filtres -->
    <div class="flex flex-wrap items-center gap-3">
      <AppSearchInput
        v-model="searchQuery"
        class="w-48"
        :placeholder="t('cohorte.dashboard.searchPlaceholder')"
      />

      <UButton
        :color="filterAlertsOnly ? 'warning' : 'neutral'"
        :variant="filterAlertsOnly ? 'solid' : 'outline'"
        size="sm"
        icon="i-tabler-alert-triangle"
        @click="filterAlertsOnly = !filterAlertsOnly"
      >
        {{ t('cohorte.dashboard.filter.alertsOnly') }}
      </UButton>

      <UButton
        :color="filterLateOnly ? 'error' : 'neutral'"
        :variant="filterLateOnly ? 'solid' : 'outline'"
        size="sm"
        icon="i-tabler-clock-x"
        @click="filterLateOnly = !filterLateOnly"
      >
        {{ t('cohorte.dashboard.filter.lateOnly') }}
      </UButton>

      <div class="ml-auto">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-tabler-download"
          @click="handleExportCsv"
        >
          {{ t('cohorte.dashboard.export.csvButton') }}
        </UButton>
      </div>
    </div>

    <!-- Grille heatmap -->
    <div class="relative overflow-auto rounded-lg border border-border-subtle bg-surface">
      <!-- État vide -->
      <div
        v-if="!loading && filteredTrainees.length === 0"
        class="flex flex-col items-center justify-center gap-3 py-16 text-center"
      >
        <UIcon name="i-tabler-users-off" class="size-10 text-text-subtle" aria-hidden="true" />
        <p class="text-sm text-text-muted">
          {{
            trainees.length === 0
              ? t('cohorte.dashboard.empty.noTrainees')
              : t('cohorte.dashboard.empty.noResults')
          }}
        </p>
      </div>

      <!-- Tableau -->
      <template v-else>
        <div
          role="grid"
          :aria-label="t('cohorte.dashboard.gridAriaLabel')"
          :aria-rowcount="filteredTrainees.length + 1"
          :aria-colcount="modules.length + 1"
          class="min-w-max"
        >
          <!-- Header row : modules -->
          <div role="row" class="flex border-b border-border-subtle" aria-rowindex="1">
            <!-- Coin supérieur gauche sticky -->
            <div
              class="sticky left-0 z-20 flex min-w-[180px] items-center border-r border-border-subtle bg-surface px-3 py-2"
              role="columnheader"
              aria-sort="none"
            >
              <span class="text-xs font-medium text-text-muted">
                {{ t('cohorte.dashboard.traineesColumnLabel') }}
              </span>
            </div>

            <!-- En-têtes modules -->
            <div
              v-for="(mod, colIdx) in modules"
              :key="mod.id"
              role="columnheader"
              :aria-colindex="colIdx + 2"
              :aria-label="`${mod.title} — S${mod.week}`"
              class="flex min-w-[80px] flex-col items-center border-r border-border-subtle px-2 py-2 last:border-r-0"
              :class="isCurrentWeek(mod.dueDate) ? 'border-b-2 border-b-accent bg-accent/5' : ''"
            >
              <span class="text-xs font-medium text-text-muted">S{{ mod.week }}</span>
              <span
                class="mt-0.5 max-w-[72px] truncate text-center text-[10px] text-text-subtle"
                :title="mod.title"
              >
                {{ mod.title }}
              </span>
            </div>
          </div>

          <!-- Lignes skeleton -->
          <template v-if="loading">
            <div
              v-for="i in 5"
              :key="`skeleton-${i}`"
              role="row"
              :aria-rowindex="i + 1"
              class="flex border-b border-border-subtle last:border-b-0"
            >
              <div
                class="sticky left-0 z-10 flex min-w-[180px] items-center gap-2 border-r border-border-subtle bg-surface px-3 py-2"
                role="gridcell"
              >
                <div class="size-7 animate-pulse rounded-full bg-muted" aria-hidden="true" />
                <div class="h-3 w-24 animate-pulse rounded bg-muted" aria-hidden="true" />
              </div>
              <div
                v-for="j in modules.length || 3"
                :key="`skeleton-cell-${j}`"
                role="gridcell"
                class="min-w-[80px] border-r border-border-subtle p-2 last:border-r-0"
              >
                <div class="h-8 animate-pulse rounded bg-muted" aria-hidden="true" />
              </div>
            </div>
          </template>

          <!-- Lignes stagiaires -->
          <div
            v-for="(trainee, rowIdx) in filteredTrainees"
            v-else
            :key="trainee.id"
            role="row"
            :aria-rowindex="rowIdx + 2"
            class="flex border-b border-border-subtle last:border-b-0"
            style="contain: content"
          >
            <!-- Colonne stagiaire (sticky) -->
            <div
              class="sticky left-0 z-10 flex min-w-[180px] items-center gap-2 border-r border-border-subtle bg-surface px-3 py-2"
              role="rowheader"
              :aria-label="traineeDisplayName(trainee)"
            >
              <div
                class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted"
                aria-hidden="true"
              >
                <img
                  v-if="trainee.avatarUrl"
                  :src="trainee.avatarUrl"
                  :alt="traineeDisplayName(trainee)"
                  class="size-7 rounded-full object-cover"
                >
                <UIcon v-else name="i-tabler-user" class="size-4 text-text-subtle" />
              </div>
              <span class="truncate text-xs font-medium text-text-default">
                {{ traineeDisplayName(trainee) }}
              </span>
            </div>

            <!-- Cellules modules -->
            <div
              v-for="(mod, colIdx) in modules"
              :key="mod.id"
              role="gridcell"
              :aria-colindex="colIdx + 2"
              :aria-rowindex="rowIdx + 2"
              :aria-label="cellAriaLabel(trainee, mod, getCell(trainee.id, mod.id))"
              :data-grid-row="rowIdx"
              :data-grid-col="colIdx"
              tabindex="0"
              class="group relative min-w-[80px] cursor-pointer border-r border-border-subtle p-1.5 outline-none last:border-r-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              :class="[
                STATUS_COLORS[getCell(trainee.id, mod.id).status],
                STATUS_PATTERNS[getCell(trainee.id, mod.id).status],
                isCurrentWeek(mod.dueDate) ? 'ring-1 ring-inset ring-accent/30' : '',
              ]"
              @click="openCellDetail(trainee, mod)"
              @keydown="handleGridKeydown($event, rowIdx, colIdx)"
              @mouseenter="
                showTooltip(
                  `${traineeDisplayName(trainee)} · ${mod.title} · ${statusLabel(getCell(trainee.id, mod.id).status)}`,
                  $event,
                )
              "
              @mouseleave="hideTooltip"
              @focus="
                showTooltip(
                  `${traineeDisplayName(trainee)} · ${mod.title} · ${statusLabel(getCell(trainee.id, mod.id).status)}`,
                  $event,
                )
              "
              @blur="hideTooltip"
            >
              <div class="flex h-8 items-center justify-center">
                <UIcon
                  :name="STATUS_ICONS[getCell(trainee.id, mod.id).status]"
                  class="size-4"
                  aria-hidden="true"
                />
                <!-- Indicateur alerte -->
                <span
                  v-if="getCell(trainee.id, mod.id).hasAlert"
                  class="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-warning-solid"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Tooltip accessible -->
    <div
      v-if="tooltipVisible && tooltipRect"
      role="tooltip"
      class="pointer-events-none fixed z-50 max-w-xs rounded-md border border-border-subtle bg-surface px-2 py-1 text-xs text-text-default shadow-lg"
      :style="{
        top: `${tooltipRect.bottom + 8}px`,
        left: `${tooltipRect.left}px`,
      }"
    >
      {{ tooltipText }}
    </div>

    <!-- Légende des couleurs -->
    <div
      class="flex flex-wrap gap-3"
      role="list"
      :aria-label="t('cohorte.dashboard.legendAriaLabel')"
    >
      <div
        v-for="[status, classes] in Object.entries(STATUS_COLORS)"
        :key="status"
        role="listitem"
        class="flex items-center gap-1.5"
      >
        <div class="size-3.5 rounded-sm border" :class="classes" aria-hidden="true" />
        <span class="text-xs text-text-muted">{{ statusLabel(status as ProgressionStatus) }}</span>
      </div>
    </div>

    <!-- Drawer de détail cellule -->
    <UModal v-model:open="showDrawer" :ui="{ width: 'sm:max-w-md' }">
      <template #content>
        <div
          v-if="selectedCell"
          class="p-6"
          role="dialog"
          :aria-label="t('cohorte.dashboard.drawer.title')"
        >
          <!-- En-tête drawer -->
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-semibold text-text-strong">
                {{ traineeDisplayName(selectedCell.trainee) }}
              </h3>
              <p class="text-sm text-text-muted">
                {{ selectedCell.module.title }}
                <span class="ml-1 text-text-subtle">— S{{ selectedCell.module.week }}</span>
              </p>
            </div>
            <UButton
              icon="i-tabler-x"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="t('common.close')"
              @click="closeDrawer"
            />
          </div>

          <!-- Statut -->
          <div
            class="mb-4 flex items-center gap-2 rounded-lg border border-border-subtle p-3"
            :class="STATUS_COLORS[selectedCell.cell.status]"
          >
            <UIcon
              :name="STATUS_ICONS[selectedCell.cell.status]"
              class="size-5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p class="text-sm font-medium text-text-strong">
                {{ statusLabel(selectedCell.cell.status) }}
              </p>
              <p class="text-xs text-text-muted">
                {{ t('cohorte.dashboard.drawer.dueDate') }}
                {{ new Date(selectedCell.module.dueDate).toLocaleDateString('fr-FR') }}
              </p>
            </div>
          </div>

          <!-- Alerte -->
          <div
            v-if="selectedCell.cell.hasAlert"
            class="mb-4 flex items-center gap-2 rounded-lg border border-warning-solid bg-warning-bg p-3"
          >
            <UIcon
              name="i-tabler-alert-triangle"
              class="size-4 shrink-0 text-warning-fg"
              aria-hidden="true"
            />
            <p class="text-sm text-warning-fg">{{ t('cohorte.dashboard.drawer.hasAlert') }}</p>
          </div>

          <!-- Liens actions -->
          <div class="flex flex-col gap-2">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-tabler-user"
              :to="`/cohortes/${cohorteId}/stagiaires/${selectedCell.trainee.id}`"
              @click="closeDrawer"
            >
              {{ t('cohorte.dashboard.drawer.viewProfile') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
