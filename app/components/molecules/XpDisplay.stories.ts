import type { Meta, StoryObj } from '@storybook/vue3-vite';
import XpDisplay from './XpDisplay.vue';

const meta: Meta<typeof XpDisplay> = {
  title: 'Molecules/XpDisplay',
  component: XpDisplay,
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
    xpTotal: { control: 'number', description: 'XP total cumulé' },
    xpObjectiveMonthly: {
      control: 'number',
      description: 'Objectif mensuel (null = pas de jauge)',
    },
    xpThisMonth: { control: 'number', description: 'XP accumulés ce mois-ci' },
  },
  args: {
    xpTotal: 350,
    xpObjectiveMonthly: null,
    xpThisMonth: 0,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SansObjectif: Story = {
  args: { xpTotal: 250 },
};

export const EnCours: Story = {
  name: 'Avec objectif — en cours',
  args: { xpTotal: 250, xpObjectiveMonthly: 500, xpThisMonth: 250 },
};

export const ObjectifAtteint: Story = {
  name: 'Avec objectif — atteint',
  args: { xpTotal: 500, xpObjectiveMonthly: 500, xpThisMonth: 500 },
};

export const DebutDeMois: Story = {
  name: 'Avec objectif — début de mois (0%)',
  args: { xpTotal: 1200, xpObjectiveMonthly: 500, xpThisMonth: 0 },
};

export const TotalEleve: Story = {
  name: 'Total XP élevé',
  args: { xpTotal: 12500, xpObjectiveMonthly: 1000, xpThisMonth: 720 },
};
