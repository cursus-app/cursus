import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CCard from './CCard.vue';

const meta: Meta<typeof CCard> = {
  title: 'Atoms/Card',
  component: CCard,
  tags: ['autodocs'],
  parameters: {
    chromatic: { modes: { light: true, dark: true } },
  },
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'] satisfies Array<
        NonNullable<InstanceType<typeof CCard>['$props']['padding']>
      >,
      description: 'Padding interne de la carte',
    },
  },
  args: { padding: 'md' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { CCard },
    setup: () => ({ args }),
    template: `
      <CCard v-bind="args">
        <p class="text-text-default">Contenu de la carte</p>
        <p class="text-sm text-text-muted mt-1">Description ou métadonnées secondaires</p>
      </CCard>
    `,
  }),
};

export const WithTitle: Story = {
  render: (args) => ({
    components: { CCard },
    setup: () => ({ args }),
    template: `
      <CCard v-bind="args">
        <h2 class="text-text-strong font-semibold text-lg">Titre de la carte</h2>
        <p class="text-sm text-text-muted mt-2">
          Description de la carte avec des informations complémentaires
          sur le contenu affiché.
        </p>
      </CCard>
    `,
  }),
};

export const AllPaddings: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CCard },
    template: `
      <div class="flex flex-col gap-4">
        <CCard padding="sm"><p class="text-text-muted text-sm">Padding: sm</p></CCard>
        <CCard padding="md"><p class="text-text-muted text-sm">Padding: md</p></CCard>
        <CCard padding="lg"><p class="text-text-muted text-sm">Padding: lg</p></CCard>
      </div>
    `,
  }),
};
