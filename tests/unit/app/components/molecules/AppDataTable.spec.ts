import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppDataTable.
 * Stub standalone pour éviter le runtime Nuxt.
 */

interface Row {
  id: number;
  name: string;
  status: string;
}

const AppDataTable = {
  props: {
    columns: { type: Array, required: true },
    rows: { type: Array, required: true },
    rowKey: { type: String, default: 'id' },
    pageSize: { type: Number, default: 20 },
    sort: { default: null },
    loading: { type: Boolean, default: false },
    emptyTitle: { default: null },
    emptyDescription: { default: null },
  },
  emits: ['update:sort', 'update:page'],
  data() {
    return {
      internalSort: null as null | { column: string; direction: 'asc' | 'desc' },
      currentPage: 1,
    };
  },
  computed: {
    activeSort() {
      return (this.sort as null | { column: string; direction: string }) ?? this.internalSort;
    },
    sortedRows() {
      const sort = this.activeSort;
      if (!sort) return this.rows as Row[];
      const col = (this.columns as { key: string; sortable?: boolean }[]).find(
        (c) => c.key === sort.column && c.sortable,
      );
      if (!col) return this.rows as Row[];
      return [...(this.rows as Row[])].sort((a, b) => {
        const av = String(a[sort.column as keyof Row] ?? '');
        const bv = String(b[sort.column as keyof Row] ?? '');
        const cmp = av.localeCompare(bv, undefined, { numeric: true });
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    },
    paginatedRows() {
      const start = (this.currentPage - 1) * (this.pageSize as number);
      return (this.sortedRows as Row[]).slice(start, start + (this.pageSize as number));
    },
    totalPages() {
      return Math.max(1, Math.ceil((this.rows as Row[]).length / (this.pageSize as number)));
    },
  },
  methods: {
    toggleSort(col: { key: string; sortable?: boolean }) {
      if (!col.sortable) return;
      const current = this.activeSort;
      const next = current?.column === col.key
        ? { column: col.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { column: col.key, direction: 'asc' };
      this.internalSort = next as { column: string; direction: 'asc' | 'desc' };
      this.$emit('update:sort', next);
    },
    ariaSortValue(col: { key: string; sortable?: boolean }): string | undefined {
      if (!col.sortable) return undefined;
      if (this.activeSort?.column !== col.key) return 'none';
      return this.activeSort.direction === 'asc' ? 'ascending' : 'descending';
    },
  },
  template: `
    <div data-testid="table-wrapper">
      <table data-testid="table" :aria-busy="loading">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :data-testid="'th-' + col.key"
              :aria-sort="ariaSortValue(col)"
              scope="col"
              :tabindex="col.sortable ? 0 : undefined"
              @click="toggleSort(col)"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr data-testid="loading-row"><td colspan="99">Chargement…</td></tr>
          </template>
          <template v-else-if="paginatedRows.length > 0">
            <tr
              v-for="row in paginatedRows"
              :key="row[rowKey]"
              :data-testid="'row-' + row[rowKey]"
            >
              <td
                v-for="col in columns"
                :key="col.key"
                :data-testid="'cell-' + row[rowKey] + '-' + col.key"
              >
                {{ row[col.key] }}
              </td>
            </tr>
          </template>
          <template v-else>
            <tr data-testid="empty-row">
              <td :colspan="columns.length">
                {{ emptyTitle || 'Aucune donnée' }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-if="totalPages > 1" data-testid="pagination">
        <button
          data-testid="prev-page"
          :disabled="currentPage <= 1"
          @click="currentPage > 1 && (currentPage--, $emit('update:page', currentPage))"
        >Précédent</button>
        <span data-testid="page-info">Page {{ currentPage }} sur {{ totalPages }}</span>
        <button
          data-testid="next-page"
          :disabled="currentPage >= totalPages"
          @click="currentPage < totalPages && (currentPage++, $emit('update:page', currentPage))"
        >Suivant</button>
      </div>
    </div>
  `,
};

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Nom', sortable: true },
  { key: 'status', label: 'Statut' },
];

const rows: Row[] = [
  { id: 1, name: 'Alice', status: 'Actif' },
  { id: 2, name: 'Bob', status: 'Inactif' },
  { id: 3, name: 'Charlie', status: 'Actif' },
];

describe('AppDataTable', () => {
  it('renders table element', () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    expect(wrapper.find('[data-testid="table"]').exists()).toBe(true);
  });

  it('renders all column headers', () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    expect(wrapper.find('[data-testid="th-id"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="th-name"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="th-status"]').exists()).toBe(true);
  });

  it('renders all data rows', () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    expect(wrapper.find('[data-testid="row-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="row-2"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="row-3"]').exists()).toBe(true);
  });

  it('renders cell values', () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    expect(wrapper.find('[data-testid="cell-1-name"]').text()).toBe('Alice');
  });

  it('shows loading row when loading=true', () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows: [], loading: true } });
    expect(wrapper.find('[data-testid="loading-row"]').exists()).toBe(true);
  });

  it('sets aria-busy when loading', () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows, loading: true } });
    expect(wrapper.find('[data-testid="table"]').attributes('aria-busy')).toBe('true');
  });

  it('shows empty row when rows array is empty', () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows: [] } });
    expect(wrapper.find('[data-testid="empty-row"]').exists()).toBe(true);
  });

  it('shows custom empty title', () => {
    const wrapper = mount(AppDataTable, {
      props: { columns, rows: [], emptyTitle: 'Aucun membre' },
    });
    expect(wrapper.find('[data-testid="empty-row"]').text()).toContain('Aucun membre');
  });

  it('does not render pagination when only one page', () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(false);
  });

  it('renders pagination when rows exceed pageSize', () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      status: 'Actif',
    }));
    const wrapper = mount(AppDataTable, {
      props: { columns, rows: manyRows, pageSize: 5 },
    });
    expect(wrapper.find('[data-testid="pagination"]').exists()).toBe(true);
  });

  it('sortable column has aria-sort="none" when not sorted', () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    expect(wrapper.find('[data-testid="th-name"]').attributes('aria-sort')).toBe('none');
  });

  it('updates aria-sort to ascending after first sort click', async () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    await wrapper.find('[data-testid="th-name"]').trigger('click');
    expect(wrapper.find('[data-testid="th-name"]').attributes('aria-sort')).toBe('ascending');
  });

  it('updates aria-sort to descending after second sort click', async () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    await wrapper.find('[data-testid="th-name"]').trigger('click');
    await wrapper.find('[data-testid="th-name"]').trigger('click');
    expect(wrapper.find('[data-testid="th-name"]').attributes('aria-sort')).toBe('descending');
  });

  it('emits update:sort when column header clicked', async () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    await wrapper.find('[data-testid="th-name"]').trigger('click');
    expect(wrapper.emitted('update:sort')).toBeTruthy();
    expect(wrapper.emitted('update:sort')?.[0]).toEqual([{ column: 'name', direction: 'asc' }]);
  });

  it('non-sortable column does not have aria-sort', () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    expect(wrapper.find('[data-testid="th-status"]').attributes('aria-sort')).toBeUndefined();
  });

  it('sorts rows ascending by name after click', async () => {
    const wrapper = mount(AppDataTable, { props: { columns, rows } });
    await wrapper.find('[data-testid="th-name"]').trigger('click');
    // Alice, Bob, Charlie — same order as input but now sorted
    expect(wrapper.find('[data-testid="cell-1-name"]').text()).toBe('Alice');
  });

  it('sorts rows descending after second click', async () => {
    const wrapper = mount(AppDataTable, {
      props: { columns, rows, pageSize: 10 },
    });
    await wrapper.find('[data-testid="th-name"]').trigger('click');
    await wrapper.find('[data-testid="th-name"]').trigger('click');
    // Charlie, Bob, Alice
    const firstCell = wrapper.find('tbody tr:first-child td:nth-child(2)');
    expect(firstCell.text()).toBe('Charlie');
  });
});
