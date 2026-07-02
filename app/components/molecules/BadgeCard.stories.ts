import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { BADGE_DEFINITIONS } from '~~/server/utils/badgeRules';
import BadgeCard from './BadgeCard.vue';

const meta: Meta<typeof BadgeCard> = {
  title: 'Molecules/BadgeCard',
  component: BadgeCard,
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
    slug: { control: 'text', description: 'Code du badge' },
    name: { control: 'text', description: 'Nom affiché du badge' },
    description: { control: 'text', description: 'Description courte' },
    icon: { control: 'text', description: 'Icône Tabler outline (i-tabler-*)' },
    unlocked: { control: 'boolean', description: 'Badge débloqué (true) ou verrouillé (false)' },
    grantedAt: { control: 'text', description: "Date ISO d'attribution" },
    mention: { control: 'text', description: 'Mention du formateur (attribution manuelle)' },
  },
  args: {
    slug: 'premier-deploy',
    name: 'Premier deploy',
    description: 'Premier livrable avec URL accessible validé.',
    icon: 'i-tabler-rocket',
    unlocked: true,
    grantedAt: null,
    mention: null,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Badge débloqué — état nominal avec icône colorée. */
export const Unlocked: Story = {
  name: 'Débloqué',
  args: {
    unlocked: true,
  },
};

/** Badge verrouillé — état grisé avec cadenas. */
export const Locked: Story = {
  name: 'Verrouillé',
  args: {
    unlocked: false,
  },
};

/** Badge débloqué avec mention du formateur (attribution manuelle). */
export const WithMention: Story = {
  name: 'Avec mention',
  args: {
    slug: 'mentor-du-jour',
    name: 'Mentor du jour',
    description: 'Attribué manuellement par un formateur.',
    icon: 'i-tabler-user-star',
    unlocked: true,
    grantedAt: new Date().toISOString(),
    mention: 'Excellent travail en pair programming cette semaine.',
  },
};

/** Badge manuel — attribué par un formateur sans check automatique. */
export const Manual: Story = {
  name: 'Attribution manuelle',
  args: {
    slug: 'mentor-du-jour',
    name: 'Mentor du jour',
    description: 'Attribué manuellement par un formateur.',
    icon: 'i-tabler-user-star',
    unlocked: true,
    mention: null,
  },
};

/** Grille complète : les 5 badges définis dans badgeRules. */
export const AllBadges: Story = {
  name: 'Tous les badges',
  render: () => ({
    components: { BadgeCard },
    setup() {
      const badges = BADGE_DEFINITIONS.map((b, i) => ({
        slug: b.code,
        name: b.name,
        description: b.description,
        icon: b.icon,
        unlocked: i % 2 === 0, // alterne débloqué/verrouillé pour la démo
      }));
      return { badges };
    },
    template: `
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 p-4">
        <BadgeCard
          v-for="badge in badges"
          :key="badge.slug"
          v-bind="badge"
        />
      </div>
    `,
  }),
};
