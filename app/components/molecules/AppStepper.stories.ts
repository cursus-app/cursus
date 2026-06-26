import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import AppStepper from './AppStepper.vue';
import type { StepperStep } from './AppStepper.vue';

const meta: Meta<typeof AppStepper> = {
  title: 'Molecules/Stepper',
  component: AppStepper,
  tags: ['autodocs'],
  parameters: {
    chromatic: {
      modes: {
        light: { theme: 'light' },
        dark: { theme: 'dark' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultSteps: StepperStep[] = [
  { id: 'identity', label: 'Identité', description: 'Vos informations', icon: 'i-tabler-user' },
  { id: 'profile', label: 'Profil', description: 'Préférences', icon: 'i-tabler-settings' },
  { id: 'confirm', label: 'Confirmation', description: 'Vérification', icon: 'i-tabler-check' },
];

export const Default: Story = {
  render: () => ({
    components: { AppStepper },
    setup() {
      const step = ref(0);
      return { step, defaultSteps };
    },
    template: `
      <AppStepper v-model="step" :steps="defaultSteps" class="max-w-2xl">
        <template #step-identity="{ isActive, goNext }">
          <div v-if="isActive" class="rounded-lg border border-border-subtle bg-surface p-6">
            <h3 class="mb-4 font-semibold text-text-strong">Étape 1 — Identité</h3>
            <p class="text-sm text-text-muted">Remplissez vos informations d'identité.</p>
            <button class="mt-4 rounded-lg bg-accent px-4 py-2 text-sm text-text-on-accent" @click="goNext">Suivant</button>
          </div>
        </template>
        <template #step-profile="{ isActive, goNext, goPrevious }">
          <div v-if="isActive" class="rounded-lg border border-border-subtle bg-surface p-6">
            <h3 class="mb-4 font-semibold text-text-strong">Étape 2 — Profil</h3>
            <p class="text-sm text-text-muted">Configurez vos préférences.</p>
            <div class="mt-4 flex gap-2">
              <button class="rounded-lg border border-border-subtle px-4 py-2 text-sm" @click="goPrevious">Retour</button>
              <button class="rounded-lg bg-accent px-4 py-2 text-sm text-text-on-accent" @click="goNext">Suivant</button>
            </div>
          </div>
        </template>
        <template #step-confirm="{ isActive, goPrevious }">
          <div v-if="isActive" class="rounded-lg border border-border-subtle bg-surface p-6">
            <h3 class="mb-4 font-semibold text-text-strong">Étape 3 — Confirmation</h3>
            <p class="text-sm text-text-muted">Vérifiez et confirmez vos informations.</p>
            <div class="mt-4 flex gap-2">
              <button class="rounded-lg border border-border-subtle px-4 py-2 text-sm" @click="goPrevious">Retour</button>
              <button class="rounded-lg bg-success-solid px-4 py-2 text-sm text-text-on-accent">Valider</button>
            </div>
          </div>
        </template>
      </AppStepper>
    `,
  }),
};

export const StepTwoActive: Story = {
  render: () => ({
    components: { AppStepper },
    setup() {
      const step = ref(1);
      return { step, defaultSteps };
    },
    template: `
      <AppStepper v-model="step" :steps="defaultSteps" class="max-w-2xl">
        <template v-for="s in defaultSteps" #[('step-' + s.id)]="{ isActive }">
          <div v-if="isActive" class="rounded-lg border border-border-subtle bg-surface p-6">
            <p class="text-sm text-text-muted">Contenu de l'étape : {{ s.label }}</p>
          </div>
        </template>
      </AppStepper>
    `,
  }),
};
