import type { Meta, StoryObj } from '@storybook/vue3-vite';
import CAvatar from './CAvatar.vue';

const meta: Meta<typeof CAvatar> = {
  title: 'Atoms/Avatar',
  component: CAvatar,
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
    src: { control: 'text', description: "URL de l'image avatar" },
    alt: { control: 'text', description: "Texte alternatif de l'image" },
    name: { control: 'text', description: 'Nom complet (pour les initiales en fallback)' },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'] satisfies Array<
        NonNullable<InstanceType<typeof CAvatar>['$props']['size']>
      >,
      description: "Taille de l'avatar",
    },
  },
  args: {
    src: null,
    alt: null,
    name: 'Mohamed Sadjad',
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithInitials: Story = {
  args: { name: 'Mohamed Sadjad', src: null },
};

export const WithImage: Story = {
  args: {
    src: 'https://avatars.githubusercontent.com/u/1',
    alt: 'Avatar GitHub',
    name: null,
  },
};

export const SingleName: Story = {
  args: { name: 'Stagiaire', src: null },
};

export const AllSizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => ({
    components: { CAvatar },
    template: `
      <div class="flex items-center gap-4">
        <CAvatar size="xs" name="Alice Bernard" />
        <CAvatar size="sm" name="Alice Bernard" />
        <CAvatar size="md" name="Alice Bernard" />
        <CAvatar size="lg" name="Alice Bernard" />
        <CAvatar size="xl" name="Alice Bernard" />
      </div>
    `,
  }),
};

export const Fallback: Story = {
  args: { name: 'Cursus App', src: null },
};
