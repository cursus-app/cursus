<script setup lang="ts" generic="T extends Record<string, unknown>">
/**
 * AppDataTable — wrapper UTable (@nuxt/ui) avec tri, filtre, pagination.
 *
 * Fonctionnalités :
 *   - Tri par colonne : clic sur en-tête → aria-sort="ascending/descending"
 *   - Pagination interne (pageSize contrôlable)
 *   - État vide intégré (AppEmptyState)
 *   - Loading skeleton
 *   - Sanitisation du sort côté client : seules les colonnes déclarées sont triables
 *
 * Accessibilité :
 *   - <table> sémantique avec <th scope="col">
 *   - aria-sort sur les colonnes triables
 *   - aria-live="polite" sur la région de résultats
 *
 * Sécurité :
 *   - Le tri se fait côté client sur les données reçues
 *   - Les valeurs de `sort.column` sont validées contre les colonnes déclarées
 *
 * Performance :
 *   - > 100 lignes : virtualisation recommandée (TanStack Table) — ce composant
 *     couvre le cas standard (< 100 lignes). Pour la virtualisation, utiliser
 *     directement TanStack Table virtual.
 */

export interface TableColumn<Row extends Record<string, unknown> = Record<string, unknown>> {
  /** Clé dans la ligne (correspond à Row[key]). */
  key: keyof Row & string;
  /** Libellé de la colonne. */
  label: string;
  /** Colonne triable. */
  sortable?: boolean;
  /** Classe CSS sur les cellules de cette colonne. */
  class?: string;
  /** Formatage optionnel. */
  format?: (value: Row[keyof Row], row: Row) => string;
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

interface Props {
  /** Colonnes de la table. */
  columns: TableColumn<T>[];
  /** Données (lignes). */
  rows: T[];
  /** Clé unique pour chaque ligne (défaut : 'id'). */
  rowKey?: keyof T & string;
  /** Nombre de lignes par page. */
  pageSize?: number;
  /** État de tri externe (optionnel, sinon géré en interne). */
  sort?: SortState | null;
  /** Chargement en cours. */
  loading?: boolean;
  /** Message vide custom. */
  emptyTitle?: string | null;
  emptyDescription?: string | null;
  /** Classe(s) CSS supplémentaires. */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id',
  pageSize: 20,
  sort: null,
  loading: false,
  emptyTitle: null,
  emptyDescription: null,
  class: '',
});

const emit = defineEmits<{
  'update:sort': [sort: SortState];
  'update:page': [page: number];
}>();

const { t } = useI18n();

// ── Tri ──────────────────────────────────────────────────────────────────────

/** Tri interne (si `sort` prop non fournie). */
const internalSort = ref<SortState | null>(null);
const activeSort = computed(() => props.sort ?? internalSort.value);

function toggleSort(column: TableColumn<T>) {
  if (!column.sortable) {
    return;
  }

  const current = activeSort.value;
  let next: SortState;

  if (current?.column === column.key) {
    next = { column: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  } else {
    next = { column: column.key, direction: 'asc' };
  }

  internalSort.value = next;
  emit('update:sort', next);
}

function ariaSortValue(column: TableColumn<T>): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.sortable) {
    return undefined;
  }
  if (activeSort.value?.column !== column.key) {
    return 'none';
  }
  return activeSort.value.direction === 'asc' ? 'ascending' : 'descending';
}

// ── Données triées ────────────────────────────────────────────────────────────

const sortedRows = computed<T[]>(() => {
  const sort = activeSort.value;
  if (!sort) {
    return props.rows;
  }

  // Validation : la colonne doit exister dans les colonnes déclarées
  const validCol = props.columns.find((c) => c.key === sort.column && c.sortable);
  if (!validCol) {
    return props.rows;
  }

  return [...props.rows].sort((a, b) => {
    const av = a[sort.column];
    const bv = b[sort.column];
    const aStr = String(av ?? '');
    const bStr = String(bv ?? '');
    const cmp = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
    return sort.direction === 'asc' ? cmp : -cmp;
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

const currentPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / props.pageSize)));

const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize;
  return sortedRows.value.slice(start, start + props.pageSize);
});

function goToPage(page: number) {
  const clamped = Math.max(1, Math.min(page, totalPages.value));
  currentPage.value = clamped;
  emit('update:page', clamped);
}

// Reset page quand les données changent
watch(() => props.rows, () => { currentPage.value = 1; });

// ── Rendu cellule ─────────────────────────────────────────────────────────────

function cellValue(col: TableColumn<T>, row: T): string {
  const raw = row[col.key];
  if (col.format) {
    return col.format(raw, row);
  }
  return raw === null || raw === undefined ? '' : String(raw);
}
</script>

<template>
  <div :class="['w-full', props.class]">
    <!-- Table sémantique -->
    <div class="overflow-x-auto rounded-lg border border-border-subtle">
      <table
        class="w-full border-collapse text-sm"
        :aria-busy="props.loading"
        aria-live="polite"
      >
        <!-- En-têtes -->
        <thead class="bg-muted">
          <tr>
            <th
              v-for="col in props.columns"
              :key="col.key"
              scope="col"
              :tabindex="col.sortable ? 0 : undefined"
              :aria-sort="ariaSortValue(col)"
              :class="[
                'border-b border-border-subtle px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted',
                col.sortable ? 'cursor-pointer select-none hover:bg-hover' : '',
                col.class,
              ]"
              @click="toggleSort(col)"
              @keydown.enter="toggleSort(col)"
              @keydown.space.prevent="toggleSort(col)"
            >
              <span class="flex items-center gap-1.5">
                {{ col.label }}
                <span
                  v-if="col.sortable"
                  :aria-label="
                    activeSort?.column === col.key
                      ? activeSort.direction === 'asc'
                        ? t('molecules.dataTable.sortDescending')
                        : t('molecules.dataTable.sortAscending')
                      : t('molecules.dataTable.sortAscending')
                  "
                >
                  <span
                    v-if="activeSort?.column === col.key && activeSort.direction === 'asc'"
                    class="i-tabler-sort-ascending size-3.5 text-accent"
                    aria-hidden="true"
                  />
                  <span
                    v-else-if="activeSort?.column === col.key && activeSort.direction === 'desc'"
                    class="i-tabler-sort-descending size-3.5 text-accent"
                    aria-hidden="true"
                  />
                  <span
                    v-else
                    class="i-tabler-selector size-3.5 opacity-40"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </th>
          </tr>
        </thead>

        <!-- Corps -->
        <tbody class="divide-y divide-border-subtle bg-surface">
          <!-- Loading skeleton -->
          <template v-if="props.loading">
            <tr v-for="i in props.pageSize" :key="`skeleton-${i}`">
              <td
                v-for="col in props.columns"
                :key="col.key"
                class="px-4 py-3"
              >
                <div class="skeleton h-4 rounded" />
              </td>
            </tr>
          </template>

          <!-- Données -->
          <template v-else-if="paginatedRows.length > 0">
            <tr
              v-for="row in paginatedRows"
              :key="String(row[props.rowKey])"
              class="transition-colors hover:bg-hover"
            >
              <td
                v-for="col in props.columns"
                :key="col.key"
                :class="['px-4 py-3 text-text-default', col.class]"
              >
                <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(col, row)">
                  {{ cellValue(col, row) }}
                </slot>
              </td>
            </tr>
          </template>

          <!-- Vide -->
          <tr v-else>
            <td :colspan="props.columns.length" class="py-0">
              <AppEmptyState
                :title="props.emptyTitle ?? t('molecules.dataTable.empty')"
                :description="props.emptyDescription ?? undefined"
                icon="i-tabler-table-off"
                class="py-12"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="mt-4 flex items-center justify-between gap-4"
    >
      <p class="text-xs text-text-muted">
        {{ t('molecules.dataTable.pageInfo', { page: currentPage, total: totalPages }) }}
      </p>
      <div class="flex gap-2">
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :disabled="currentPage <= 1"
          :aria-label="t('molecules.dataTable.previous')"
          leading-icon="i-tabler-chevron-left"
          @click="goToPage(currentPage - 1)"
        >
          {{ t('common.previous') }}
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          :disabled="currentPage >= totalPages"
          :aria-label="t('molecules.dataTable.next')"
          trailing-icon="i-tabler-chevron-right"
          @click="goToPage(currentPage + 1)"
        >
          {{ t('common.next') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
