<script setup lang="ts">
/**
 * QuizEditor — éditeur de quiz attaché à un module.
 * Cf. ST-07.1 — TT-07.1.2 (composant QuizEditor).
 *
 * - Charge le quiz existant si `quizId` est fourni.
 * - Permet d'ajouter/supprimer des questions (QCM ou texte court).
 * - Auto-save avec debounce 1,5 s sur chaque modification.
 * - Validation inline : au moins 1 bonne réponse cochée, texte non vide…
 * - En mode `readonly` : désactive tous les contrôles.
 */
import type { QuizQuestion, McqQuestion, ShortTextQuestion, McqOption } from '~~/shared/types/quiz';

interface Props {
  quizId?: string | null;
  moduleId: string;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  quizId: null,
  readonly: false,
});

const emit = defineEmits<{
  /** Émis après chaque sauvegarde réussie avec le quizId (utile si créé pour la 1ère fois). */
  saved: [quizId: string];
  /** Émis quand le quiz est supprimé. */
  deleted: [];
}>();

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && 'data' in err) {
    const data = (err as { data?: { message?: unknown } }).data;
    if (typeof data?.message === 'string') {
      return data.message;
    }
  }
  return fallback;
}

// ─── i18n ─────────────────────────────────────────────────────────────────────

const { t } = useT();

// ─── État ─────────────────────────────────────────────────────────────────────

/** quizId courant — peut évoluer si le quiz est créé pendant la session. */
const currentQuizId = ref<string | null>(props.quizId ?? null);

const quizTitle = ref('');
const passingScore = ref(70);
const randomize = ref(false);
const questions = ref<QuizQuestion[]>([]);

const isLoading = ref(false);
const isSaving = ref(false);
const saveError = ref<string | null>(null);
const saveSuccess = ref(false);

/** Erreurs de validation par index de question. */
const validationErrors = ref<Record<number, string>>({});

// ─── Chargement ───────────────────────────────────────────────────────────────

async function loadQuiz(): Promise<void> {
  if (!currentQuizId.value) {
    return;
  }
  isLoading.value = true;
  saveError.value = null;
  try {
    const data = await $fetch<{
      id: string;
      title: string;
      passingScore: number;
      randomize: boolean;
      questions: QuizQuestion[];
    }>(`/api/quizzes/${currentQuizId.value}`);

    quizTitle.value = data.title;
    passingScore.value = data.passingScore;
    randomize.value = data.randomize;
    questions.value = data.questions;
  } catch (err: unknown) {
    saveError.value = getErrorMessage(err, t('errors.generic'));
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadQuiz();
});

// ─── Validation ───────────────────────────────────────────────────────────────

function validateQuestion(q: QuizQuestion): string | null {
  if (!q.text.trim()) {
    return t('cursus.modules.quiz.errors.questionTextRequired');
  }
  if (q.type === 'mcq') {
    const mcq = q as McqQuestion;
    if (mcq.options.length < 2) {
      return t('cursus.modules.quiz.errors.atLeastTwoOptions');
    }
    if (!mcq.options.some((o) => o.isCorrect)) {
      return t('cursus.modules.quiz.errors.atLeastOneCorrectAnswer');
    }
  }
  if (q.type === 'short_text') {
    const st = q as ShortTextQuestion;
    if (!st.requiresManualValidation && !st.expectedAnswer.trim()) {
      return t('cursus.modules.quiz.errors.expectedAnswerRequired');
    }
  }
  return null;
}

function validateAll(): boolean {
  const errors: Record<number, string> = {};
  questions.value.forEach((q, idx) => {
    const err = validateQuestion(q);
    if (err) {
      errors[idx] = err;
    }
  });
  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
}

// ─── Sauvegarde ───────────────────────────────────────────────────────────────

async function save(): Promise<void> {
  if (props.readonly) {
    return;
  }
  if (questions.value.length === 0) {
    return;
  }
  if (!validateAll()) {
    return;
  }

  isSaving.value = true;
  saveError.value = null;
  saveSuccess.value = false;

  try {
    const payload = {
      title: quizTitle.value || t('cursus.modules.quiz.defaultTitle'),
      passingScore: passingScore.value,
      randomize: randomize.value,
      questions: questions.value,
    };

    if (currentQuizId.value) {
      // Mise à jour d'un quiz existant.
      await $fetch(`/api/quizzes/${currentQuizId.value}`, {
        method: 'PATCH',
        body: payload,
      });
    } else {
      // Création d'un nouveau quiz, attaché au module.
      const created = await $fetch<{ id: string }>('/api/quizzes', {
        method: 'POST',
        body: { ...payload, moduleId: props.moduleId },
      });
      currentQuizId.value = created.id;
    }

    saveSuccess.value = true;
    if (currentQuizId.value) {
      emit('saved', currentQuizId.value);
    }

    // Masquer l'indicateur de succès après 2 s.
    setTimeout(() => {
      saveSuccess.value = false;
    }, 2_000);
  } catch (err: unknown) {
    saveError.value = getErrorMessage(err, t('errors.generic'));
  } finally {
    isSaving.value = false;
  }
}

const autosave = useDebounceFn(() => {
  void save();
}, 1_500);

function onAnyChange(): void {
  // Réinitialiser les erreurs de validation au prochain changement.
  validationErrors.value = {};
  autosave();
}

// ─── Gestion des questions ─────────────────────────────────────────────────────

function addMcqQuestion(): void {
  const newQuestion: McqQuestion = {
    id: crypto.randomUUID(),
    type: 'mcq',
    text: '',
    options: [
      { id: crypto.randomUUID(), text: '', isCorrect: false },
      { id: crypto.randomUUID(), text: '', isCorrect: false },
    ],
    explanation: '',
  };
  questions.value = [...questions.value, newQuestion];
  onAnyChange();
}

function addShortTextQuestion(): void {
  const newQuestion: ShortTextQuestion = {
    id: crypto.randomUUID(),
    type: 'short_text',
    text: '',
    expectedAnswer: '',
    caseSensitive: false,
    requiresManualValidation: false,
    explanation: '',
  };
  questions.value = [...questions.value, newQuestion];
  onAnyChange();
}

function removeQuestion(index: number): void {
  questions.value = questions.value.filter((_, i) => i !== index);
  // Reconstruire l'objet d'erreurs sans la clé supprimée.
  validationErrors.value = Object.fromEntries(
    Object.entries(validationErrors.value).filter(([k]) => Number(k) !== index),
  );
  onAnyChange();
}

function updateQuestionText(index: number, value: string): void {
  const q = questions.value[index];
  if (!q) {
    return;
  }
  questions.value = questions.value.map((question, i) =>
    i === index ? { ...question, text: value } : question,
  );
  onAnyChange();
}

function updateQuestionExplanation(index: number, value: string): void {
  const q = questions.value[index];
  if (!q) {
    return;
  }
  questions.value = questions.value.map((question, i) =>
    i === index ? { ...question, explanation: value } : question,
  );
  onAnyChange();
}

// ─── Gestion des options QCM ──────────────────────────────────────────────────

function addOption(questionIndex: number): void {
  const q = questions.value[questionIndex];
  if (!q || q.type !== 'mcq') {
    return;
  }
  const mcq = q as McqQuestion;
  if (mcq.options.length >= 8) {
    return;
  }
  const newOption: McqOption = { id: crypto.randomUUID(), text: '', isCorrect: false };
  questions.value = questions.value.map((question, i) =>
    i === questionIndex ? { ...mcq, options: [...mcq.options, newOption] } : question,
  );
  onAnyChange();
}

function removeOption(questionIndex: number, optionId: string): void {
  const q = questions.value[questionIndex];
  if (!q || q.type !== 'mcq') {
    return;
  }
  const mcq = q as McqQuestion;
  if (mcq.options.length <= 2) {
    return;
  }
  questions.value = questions.value.map((question, i) =>
    i === questionIndex
      ? { ...mcq, options: mcq.options.filter((o) => o.id !== optionId) }
      : question,
  );
  onAnyChange();
}

function updateOptionText(questionIndex: number, optionId: string, value: string): void {
  const q = questions.value[questionIndex];
  if (!q || q.type !== 'mcq') {
    return;
  }
  const mcq = q as McqQuestion;
  questions.value = questions.value.map((question, i) =>
    i === questionIndex
      ? {
          ...mcq,
          options: mcq.options.map((o) => (o.id === optionId ? { ...o, text: value } : o)),
        }
      : question,
  );
  onAnyChange();
}

function toggleOptionCorrect(questionIndex: number, optionId: string): void {
  const q = questions.value[questionIndex];
  if (!q || q.type !== 'mcq') {
    return;
  }
  const mcq = q as McqQuestion;
  questions.value = questions.value.map((question, i) =>
    i === questionIndex
      ? {
          ...mcq,
          options: mcq.options.map((o) =>
            o.id === optionId ? { ...o, isCorrect: !o.isCorrect } : o,
          ),
        }
      : question,
  );
  onAnyChange();
}

// ─── Gestion des questions texte court ────────────────────────────────────────

function updateExpectedAnswer(questionIndex: number, value: string): void {
  const q = questions.value[questionIndex];
  if (!q || q.type !== 'short_text') {
    return;
  }
  questions.value = questions.value.map((question, i) =>
    i === questionIndex ? { ...q, expectedAnswer: value } : question,
  );
  onAnyChange();
}

function toggleCaseSensitive(questionIndex: number): void {
  const q = questions.value[questionIndex];
  if (!q || q.type !== 'short_text') {
    return;
  }
  const st = q as ShortTextQuestion;
  questions.value = questions.value.map((question, i) =>
    i === questionIndex ? { ...st, caseSensitive: !st.caseSensitive } : question,
  );
  onAnyChange();
}

function toggleManualValidation(questionIndex: number): void {
  const q = questions.value[questionIndex];
  if (!q || q.type !== 'short_text') {
    return;
  }
  const st = q as ShortTextQuestion;
  questions.value = questions.value.map((question, i) =>
    i === questionIndex
      ? { ...st, requiresManualValidation: !st.requiresManualValidation }
      : question,
  );
  onAnyChange();
}

// ─── Suppression du quiz ─────────────────────────────────────────────────────

const showDeleteConfirm = ref(false);
const isDeleting = ref(false);
const deleteError = ref<string | null>(null);

async function deleteQuiz(): Promise<void> {
  if (!currentQuizId.value) {
    return;
  }
  isDeleting.value = true;
  deleteError.value = null;
  try {
    const url: string = `/api/quizzes/${currentQuizId.value}`;
    await $fetch(url, { method: 'DELETE' });
    currentQuizId.value = null;
    questions.value = [];
    quizTitle.value = '';
    showDeleteConfirm.value = false;
    emit('deleted');
  } catch (err: unknown) {
    deleteError.value = getErrorMessage(err, t('errors.generic'));
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Chargement -->
    <div v-if="isLoading" class="flex items-center gap-2 text-sm text-text-muted" role="status">
      <UIcon name="i-tabler-loader-2" class="size-4 animate-spin" />
      {{ t('cursus.modules.quiz.loading') }}
    </div>

    <template v-else>
      <!-- En-tête quiz + indicateur de sauvegarde -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-tabler-help-circle" class="size-5 text-accent-text" />
          <span class="text-sm font-semibold text-text-strong">
            {{ t('cursus.modules.quiz.sectionTitle') }}
          </span>
          <span
            v-if="questions.length > 0"
            class="rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent-text"
          >
            {{ t('cursus.modules.quiz.questionCount', { count: questions.length }) }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <p v-if="isSaving" class="flex items-center gap-1 text-xs text-text-muted" role="status">
            <UIcon name="i-tabler-loader-2" class="size-3.5 animate-spin" />
            {{ t('cursus.modules.quiz.saving') }}
          </p>
          <p
            v-else-if="saveSuccess"
            class="flex items-center gap-1 text-xs text-success-fg"
            role="status"
          >
            <UIcon name="i-tabler-check" class="size-3.5" />
            {{ t('cursus.modules.quiz.saved') }}
          </p>
          <p v-if="saveError" class="flex items-center gap-1 text-xs text-danger-fg" role="alert">
            <UIcon name="i-tabler-alert-circle" class="size-3.5" />
            {{ saveError }}
          </p>
        </div>
      </div>

      <!-- Paramètres généraux du quiz -->
      <div
        class="grid grid-cols-1 gap-4 rounded-lg border border-border-subtle bg-surface p-4 sm:grid-cols-2"
      >
        <!-- Titre -->
        <div class="sm:col-span-2">
          <CInput
            :model-value="quizTitle"
            :label="t('cursus.modules.quiz.titleLabel')"
            :placeholder="t('cursus.modules.quiz.titlePlaceholder')"
            :disabled="props.readonly"
            @update:model-value="
              (v: string) => {
                quizTitle = v;
                onAnyChange();
              }
            "
          />
        </div>

        <!-- Score de passage -->
        <div>
          <CInput
            :model-value="String(passingScore)"
            type="number"
            :label="t('cursus.modules.quiz.passingScoreLabel')"
            :placeholder="t('cursus.modules.quiz.passingScorePlaceholder')"
            :disabled="props.readonly"
            @update:model-value="
              (v: string) => {
                passingScore = Math.min(100, Math.max(0, Number(v)));
                onAnyChange();
              }
            "
          />
          <p class="mt-0.5 text-xs text-text-subtle">
            {{ t('cursus.modules.quiz.passingScoreHint') }}
          </p>
        </div>

        <!-- Randomisation -->
        <div class="flex items-center pt-5">
          <CSwitch
            :model-value="randomize"
            :label="t('cursus.modules.quiz.randomizeLabel')"
            :description="t('cursus.modules.quiz.randomizeDescription')"
            :disabled="props.readonly"
            @update:model-value="
              (v: boolean) => {
                randomize = v;
                onAnyChange();
              }
            "
          />
        </div>
      </div>

      <!-- Liste des questions -->
      <div v-if="questions.length > 0" class="space-y-3">
        <div
          v-for="(question, qIdx) in questions"
          :key="question.id"
          class="rounded-lg border border-border-subtle bg-surface"
        >
          <!-- En-tête de la question -->
          <div class="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-text-muted">
                {{ t('cursus.modules.quiz.questionNumber', { n: qIdx + 1 }) }}
              </span>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="
                  question.type === 'mcq'
                    ? 'bg-accent-subtle text-accent-text'
                    : 'bg-info-bg text-info-fg'
                "
              >
                {{
                  question.type === 'mcq'
                    ? t('cursus.modules.quiz.typeMcq')
                    : t('cursus.modules.quiz.typeShortText')
                }}
              </span>
            </div>
            <button
              v-if="!props.readonly"
              type="button"
              class="flex size-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger-bg hover:text-danger-fg"
              :aria-label="t('cursus.modules.quiz.removeQuestion', { n: qIdx + 1 })"
              @click="removeQuestion(qIdx)"
            >
              <UIcon name="i-tabler-x" class="size-4" />
            </button>
          </div>

          <!-- Corps de la question -->
          <div class="space-y-4 p-4">
            <!-- Erreur de validation -->
            <div
              v-if="validationErrors[qIdx]"
              role="alert"
              class="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-fg"
            >
              <UIcon name="i-tabler-alert-circle" class="mt-0.5 size-4 shrink-0" />
              <span>{{ validationErrors[qIdx] }}</span>
            </div>

            <!-- Énoncé -->
            <CInput
              :model-value="question.text"
              :label="t('cursus.modules.quiz.questionTextLabel')"
              :placeholder="t('cursus.modules.quiz.questionTextPlaceholder')"
              :disabled="props.readonly"
              :aria-label="t('cursus.modules.quiz.questionTextAriaLabel', { n: qIdx + 1 })"
              @update:model-value="(v: string) => updateQuestionText(qIdx, v)"
            />

            <!-- Options QCM -->
            <template v-if="question.type === 'mcq'">
              <div>
                <p class="mb-2 text-sm font-medium text-text-strong">
                  {{ t('cursus.modules.quiz.optionsLabel') }}
                </p>
                <div class="space-y-2">
                  <div
                    v-for="option in (question as McqQuestion).options"
                    :key="option.id"
                    class="flex items-center gap-2"
                  >
                    <!-- Case "correcte" -->
                    <CCheckbox
                      :model-value="option.isCorrect"
                      :disabled="props.readonly"
                      :aria-label="
                        t('cursus.modules.quiz.optionCorrectAriaLabel', {
                          text: option.text || '...',
                        })
                      "
                      @update:model-value="() => toggleOptionCorrect(qIdx, option.id)"
                    />

                    <!-- Texte de l'option -->
                    <div class="flex-1">
                      <CInput
                        :model-value="option.text"
                        :placeholder="t('cursus.modules.quiz.optionTextPlaceholder')"
                        :disabled="props.readonly"
                        :aria-label="t('cursus.modules.quiz.optionTextAriaLabel')"
                        @update:model-value="(v: string) => updateOptionText(qIdx, option.id, v)"
                      />
                    </div>

                    <!-- Supprimer l'option -->
                    <button
                      v-if="!props.readonly && (question as McqQuestion).options.length > 2"
                      type="button"
                      class="flex size-7 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-danger-bg hover:text-danger-fg"
                      :aria-label="t('cursus.modules.quiz.removeOption')"
                      @click="removeOption(qIdx, option.id)"
                    >
                      <UIcon name="i-tabler-minus" class="size-3.5" />
                    </button>
                  </div>
                </div>

                <!-- Ajouter une option -->
                <button
                  v-if="!props.readonly && (question as McqQuestion).options.length < 8"
                  type="button"
                  class="mt-2 flex items-center gap-1 text-sm text-accent-text transition-colors hover:text-accent-text/80"
                  @click="addOption(qIdx)"
                >
                  <UIcon name="i-tabler-plus" class="size-4" />
                  {{ t('cursus.modules.quiz.addOption') }}
                </button>
                <p class="mt-1 text-xs text-text-subtle">
                  {{ t('cursus.modules.quiz.optionCorrectHint') }}
                </p>
              </div>
            </template>

            <!-- Réponse texte court -->
            <template v-else-if="question.type === 'short_text'">
              <div class="space-y-3">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <CSwitch
                    :model-value="(question as ShortTextQuestion).requiresManualValidation"
                    :label="t('cursus.modules.quiz.manualValidationLabel')"
                    :description="t('cursus.modules.quiz.manualValidationDescription')"
                    :disabled="props.readonly"
                    @update:model-value="() => toggleManualValidation(qIdx)"
                  />
                </div>

                <template v-if="!(question as ShortTextQuestion).requiresManualValidation">
                  <CInput
                    :model-value="(question as ShortTextQuestion).expectedAnswer"
                    :label="t('cursus.modules.quiz.expectedAnswerLabel')"
                    :placeholder="t('cursus.modules.quiz.expectedAnswerPlaceholder')"
                    :disabled="props.readonly"
                    @update:model-value="(v: string) => updateExpectedAnswer(qIdx, v)"
                  />

                  <div class="flex items-center gap-3">
                    <CSwitch
                      :model-value="(question as ShortTextQuestion).caseSensitive"
                      :label="t('cursus.modules.quiz.caseSensitiveLabel')"
                      :description="t('cursus.modules.quiz.caseSensitiveDescription')"
                      :disabled="props.readonly"
                      @update:model-value="() => toggleCaseSensitive(qIdx)"
                    />
                  </div>
                </template>
              </div>
            </template>

            <!-- Explication post-réponse -->
            <CInput
              :model-value="question.explanation"
              :label="t('cursus.modules.quiz.explanationLabel')"
              :placeholder="t('cursus.modules.quiz.explanationPlaceholder')"
              :disabled="props.readonly"
              @update:model-value="(v: string) => updateQuestionExplanation(qIdx, v)"
            />
          </div>
        </div>
      </div>

      <!-- Zone vide -->
      <div
        v-else
        class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle bg-subtle py-8"
      >
        <UIcon name="i-tabler-help-circle" class="size-8 text-text-subtle" />
        <p class="text-sm text-text-muted">{{ t('cursus.modules.quiz.noQuestions') }}</p>
      </div>

      <!-- Boutons d'ajout de question -->
      <div v-if="!props.readonly" class="flex flex-wrap items-center gap-2">
        <UButton
          type="button"
          variant="outline"
          size="sm"
          icon="i-tabler-list-check"
          @click="addMcqQuestion"
        >
          {{ t('cursus.modules.quiz.addMcqQuestion') }}
        </UButton>

        <UButton
          type="button"
          variant="outline"
          size="sm"
          icon="i-tabler-text-size"
          @click="addShortTextQuestion"
        >
          {{ t('cursus.modules.quiz.addShortTextQuestion') }}
        </UButton>

        <!-- Supprimer le quiz (si existant) -->
        <div v-if="currentQuizId" class="ml-auto">
          <UButton
            v-if="!showDeleteConfirm"
            type="button"
            color="error"
            variant="ghost"
            size="sm"
            icon="i-tabler-trash"
            @click="showDeleteConfirm = true"
          >
            {{ t('cursus.modules.quiz.deleteQuiz') }}
          </UButton>

          <div v-else class="flex items-center gap-2">
            <p class="text-xs text-danger-fg">{{ t('cursus.modules.quiz.deleteConfirm') }}</p>
            <UButton
              type="button"
              color="error"
              size="sm"
              :loading="isDeleting"
              @click="deleteQuiz"
            >
              {{ t('cursus.modules.quiz.deleteConfirmYes') }}
            </UButton>
            <UButton type="button" variant="ghost" size="sm" @click="showDeleteConfirm = false">
              {{ t('common.cancel') }}
            </UButton>
          </div>
          <p v-if="deleteError" role="alert" class="mt-1 text-xs text-danger-fg">
            {{ deleteError }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
