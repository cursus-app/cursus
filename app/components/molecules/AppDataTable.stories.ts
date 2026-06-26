import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppDataTable from './AppDataTable.vue';
import type { TableColumn } from './AppDataTable.vue';

interface User extends Record<string, unknown> {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
}

const columns: TableColumn[] = [
  { key: 'name', label: 'Nom', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Rôle' },
  { key: 'status', label: 'Statut' },
];

const rows: User[] = [
  { id: 1, name: 'Alice Dupont', email: 'alice@cursus.app', role: 'Stagiaire', status: 'Actif' },
  { id: 2, name: 'Bob Martin', email: 'bob@cursus.app', role: 'Formateur', status: 'Actif' },
  { id: 3, name: 'Charlie Durand', email: 'charlie@cursus.app', role: 'Stagiaire', status: 'Inactif' },
  { id: 4, name: 'Diana Petit', email: 'diana@cursus.app', role: 'Stagiaire', status: 'Actif' },
  { id: 5, name: 'Édouard Blanc', email: 'edouard@cursus.app', role: 'Co-formateur', status: 'Actif' },
];

const meta: Meta<typeof AppDataTable> = {
  title: 'Molecules/DataTable',
  // @ts-expect-error — Generic Vue components are not supported by Storybook Meta type inference.
  // AppDataTable uses `generic="T extends Record<string, unknown>"` which vue-tsc cannot resolve
  // into a ConcreteComponent shape that Storybook's Meta expects. Works correctly at runtime.
  component: AppDataTable,
  tags: ['autodocs'],
  parameters: {
    chromatic: {
      modes: {
        light: { theme: 'light' },
        dark: { theme: 'dark' },
      },
    },
  },
  argTypes: {
    loading: { control: 'boolean', description: 'Chargement en cours' },
    pageSize: { control: 'number', description: 'Lignes par page' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { AppDataTable },
    setup() {
      return { columns, rows };
    },
    template: `
      <AppDataTable :columns="columns" :rows="rows" row-key="id" />
    `,
  }),
};

export const Loading: Story = {
  render: () => ({
    components: { AppDataTable },
    setup() {
      return { columns, rows: [] };
    },
    template: `
      <AppDataTable :columns="columns" :rows="rows" :loading="true" :page-size="5" row-key="id" />
    `,
  }),
};

export const Empty: Story = {
  render: () => ({
    components: { AppDataTable },
    setup() {
      return { columns, rows: [] };
    },
    template: `
      <AppDataTable
        :columns="columns"
        :rows="rows"
        row-key="id"
        empty-title="Aucun membre"
        empty-description="Invitez des stagiaires pour les voir apparaître ici."
      />
    `,
  }),
};

export const WithPagination: Story = {
  render: () => ({
    components: { AppDataTable },
    setup() {
      const manyRows: User[] = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Utilisateur ${i + 1}`,
        email: `user${i + 1}@cursus.app`,
        role: i % 3 === 0 ? 'Formateur' : 'Stagiaire',
        status: i % 4 === 0 ? 'Inactif' : 'Actif',
      }));
      return { columns, rows: manyRows };
    },
    template: `
      <AppDataTable :columns="columns" :rows="rows" :page-size="5" row-key="id" />
    `,
  }),
};

export const WithCustomCell: Story = {
  render: () => ({
    components: { AppDataTable },
    setup() {
      return { columns, rows };
    },
    template: `
      <AppDataTable :columns="columns" :rows="rows" row-key="id">
        <template #cell-status="{ value }">
          <span
            :class="[
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              value === 'Actif'
                ? 'bg-success-bg text-success-fg'
                : 'bg-muted text-text-muted',
            ]"
          >
            {{ value }}
          </span>
        </template>
      </AppDataTable>
    `,
  }),
};
