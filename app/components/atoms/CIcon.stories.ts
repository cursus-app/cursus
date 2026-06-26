import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CIcon from './CIcon.vue';

const meta: Meta<typeof CIcon> = {
  title: 'Atoms/Icon',
  component: CIcon,
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
    name: {
      control: 'text',
      description: "Nom de l'icône Tabler (préfixe i-tabler- obligatoire)",
    },
    size: {
      control: 'select',
      options: [16, 20, 24],
      description: 'Taille en px',
    },
    color: {
      control: 'text',
      description:
        'Classe de couleur du design system (ex: text-accent, text-text-muted) ou "inherit"',
    },
  },
  args: {
    name: 'i-tabler-check',
    size: 20,
    color: 'inherit',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CIcon },
    template: `
      <div class="flex items-center gap-4">
        <CIcon name="i-tabler-star" :size="16" />
        <CIcon name="i-tabler-star" :size="20" />
        <CIcon name="i-tabler-star" :size="24" />
      </div>
    `,
  }),
};

export const WithAccentColor: Story = {
  args: { name: 'i-tabler-check-circle', color: 'text-accent', size: 24 },
};

export const WithSuccessColor: Story = {
  args: { name: 'i-tabler-circle-check', color: 'text-success-fg', size: 24 },
};

export const WithDangerColor: Story = {
  args: { name: 'i-tabler-alert-circle', color: 'text-danger-fg', size: 24 },
};

export const CommonIcons: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CIcon },
    template: `
      <div class="flex flex-wrap items-center gap-4 text-text-default">
        <CIcon name="i-tabler-home" />
        <CIcon name="i-tabler-user" />
        <CIcon name="i-tabler-settings" />
        <CIcon name="i-tabler-check" />
        <CIcon name="i-tabler-x" />
        <CIcon name="i-tabler-plus" />
        <CIcon name="i-tabler-edit" />
        <CIcon name="i-tabler-trash" />
        <CIcon name="i-tabler-chevron-right" />
        <CIcon name="i-tabler-arrow-left" />
        <CIcon name="i-tabler-loader-2" class="animate-spin" />
      </div>
    `,
  }),
};
