<script setup lang="ts">
/**
 * AppStepper — multi-step form stepper.
 *
 * Wraps USteps de @nuxt/ui avec v-model sur l'étape courante.
 * Expose des slots nommés step-N pour le contenu de chaque étape.
 *
 * Accessibilité :
 *   - aria-label sur le nav de progression
 *   - Les étapes futures sont aria-disabled
 *   - Annonce dynamique de l'étape via aria-live (srOnly)
 */

export interface StepperStep {
  /** Clé unique de l'étape. */
  id: string;
  /** Libellé affiché dans l'indicateur. */
  label: string;
  /** Description optionnelle (sous le label). */
  description?: string;
  /** Icône Tabler optionnelle (ex : 'i-tabler-user'). */
  icon?: string;
}

interface Props {
  /** Liste des étapes. */
  steps: StepperStep[];
  /** Étape active (index 0-based). */
  modelValue?: number;
  /** Classe(s) CSS supplémentaires. */
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  class: '',
});

const emit = defineEmits<{ 'update:modelValue': [step: number] }>();

const { t } = useI18n();

const currentStep = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

function goTo(index: number) {
  // Autoriser seulement les étapes déjà visitées (≤ currentStep)
  if (index <= currentStep.value) {
    currentStep.value = index;
  }
}

const isFirst = computed(() => currentStep.value === 0);
const isLast = computed(() => currentStep.value === props.steps.length - 1);

function next() {
  if (!isLast.value) {
    currentStep.value = currentStep.value + 1;
  }
}

function previous() {
  if (!isFirst.value) {
    currentStep.value = currentStep.value - 1;
  }
}

/** Expose les méthodes de navigation aux parents. */
defineExpose({ next, previous, isFirst, isLast });

const currentStepData = computed(() => props.steps[currentStep.value]);

const ariaLive = computed(() =>
  currentStepData.value
    ? t('molecules.stepper.stepOf', {
        current: currentStep.value + 1,
        total: props.steps.length,
      })
    : '',
);
</script>

<template>
  <div :class="['w-full', props.class]">
    <!-- Indicateurs d'étapes -->
    <nav
      :aria-label="ariaLive"
      class="mb-8"
    >
      <ol class="flex items-center gap-0">
        <li
          v-for="(step, index) in props.steps"
          :key="step.id"
          class="flex flex-1 items-center"
        >
          <!-- Bouton étape -->
          <button
            type="button"
            :aria-current="index === currentStep ? 'step' : undefined"
            :aria-disabled="index > currentStep"
            :disabled="index > currentStep"
            class="flex flex-col items-center gap-1 disabled:pointer-events-none"
            @click="goTo(index)"
          >
            <!-- Cercle indicateur -->
            <span
              :class="[
                'flex size-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                index < currentStep
                  ? 'border-accent bg-accent text-text-on-accent'
                  : index === currentStep
                    ? 'border-accent bg-surface text-accent'
                    : 'border-border-default bg-surface text-text-muted',
              ]"
            >
              <!-- Étape complétée : checkmark -->
              <span
                v-if="index < currentStep"
                class="i-tabler-check size-4"
                aria-hidden="true"
              />
              <!-- Icône custom ou numéro -->
              <span
                v-else-if="step.icon"
                :class="[step.icon, 'size-4']"
                aria-hidden="true"
              />
              <span v-else aria-hidden="true">{{ index + 1 }}</span>
            </span>

            <!-- Label + description -->
            <span class="hidden text-center sm:block">
              <span
                :class="[
                  'block text-xs font-medium',
                  index === currentStep ? 'text-text-strong' : 'text-text-muted',
                ]"
              >
                {{ step.label }}
              </span>
              <span
                v-if="step.description"
                class="block text-xs text-text-subtle"
              >
                {{ step.description }}
              </span>
            </span>
          </button>

          <!-- Connecteur entre étapes -->
          <div
            v-if="index < props.steps.length - 1"
            :class="[
              'mx-2 h-0.5 flex-1',
              index < currentStep ? 'bg-accent' : 'bg-border-subtle',
            ]"
            aria-hidden="true"
          />
        </li>
      </ol>
    </nav>

    <!-- Annonce dynamique SR -->
    <span class="sr-only" aria-live="polite" aria-atomic="true">{{ ariaLive }}</span>

    <!-- Contenu de l'étape courante -->
    <div>
      <slot
        v-for="(step, index) in props.steps"
        :key="step.id"
        :name="`step-${step.id}`"
        :step="step"
        :index="index"
        :is-active="index === currentStep"
        :is-first="index === 0"
        :is-last="index === props.steps.length - 1"
        :go-next="next"
        :go-previous="previous"
      />
    </div>
  </div>
</template>
