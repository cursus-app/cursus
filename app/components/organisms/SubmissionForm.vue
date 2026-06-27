<script setup lang="ts">
/**
 * SubmissionForm — formulaire de soumission de livrable.
 *
 * Permet au stagiaire de soumettre son URL de repo GitHub et son URL de
 * déploiement. Valide côté client avant envoi.
 *
 * Sécurité :
 *  - Valide que l'URL est un repo GitHub (regex)
 *  - Valide que le repo appartient au compte GitHub lié (githubHandle)
 *  - Désactive le bouton si progression terminale ou anti-spam actif
 *
 * Émet `submitted` avec { submissionId, harnessRunId } après soumission réussie.
 *
 * Cf. ST-05.2 — TT-05.2.2.
 */
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import {
  SubmitDelivrableSchema,
  GITHUB_REPO_URL_REGEX,
} from '~~/shared/schemas/submission';
import type { SubmitDelivrableResponse } from '~~/shared/schemas/submission';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** ID de la progression à soumettre. */
  progressionId: string;
  /** Statut actuel de la progression. */
  progressionStatus: string;
  /** Handle GitHub lié du stagiaire (null si non lié). */
  githubHandle: string | null;
  /** Si true, le stagiaire a atteint la limite de soumissions échouées. */
  isSpamBlocked?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSpamBlocked: false,
});

// ─── Emits ────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  submitted: [result: SubmitDelivrableResponse];
}>();

// ─── Composables ─────────────────────────────────────────────────────────────

const { t } = useT();
const toast = useAppToast();

// ─── Formulaire vee-validate + Zod ────────────────────────────────────────────

const { handleSubmit, defineField, errors, isSubmitting, resetForm } = useForm({
  validationSchema: toTypedSchema(SubmitDelivrableSchema),
});

const [repoUrl, repoUrlAttrs] = defineField('repoUrl');
const [deployUrl, deployUrlAttrs] = defineField('deployUrl');

// ─── État local ───────────────────────────────────────────────────────────────

const submitError = ref<string | null>(null);

// ─── Computed ─────────────────────────────────────────────────────────────────

const terminalStatuses = ['VALIDE', 'VALIDE_OVERRIDE'] as const;

const isTerminal = computed(() =>
  (terminalStatuses as readonly string[]).includes(props.progressionStatus),
);

const isAlreadyRunning = computed(() => props.progressionStatus === 'SOUMIS');

const isDisabled = computed(
  () =>
    isTerminal.value ||
    isAlreadyRunning.value ||
    props.isSpamBlocked ||
    !props.githubHandle ||
    isSubmitting.value,
);

/** Validation client : le repo contient le handle GitHub de l'utilisateur. */
const repoUrlHandleError = computed(() => {
  if (!repoUrl.value || !props.githubHandle) {return null;}
  if (!GITHUB_REPO_URL_REGEX.test(repoUrl.value)) {return null;} // l'erreur Zod suffira

  const normalizedHandle = props.githubHandle.toLowerCase();
  const normalizedUrl = repoUrl.value.toLowerCase();
  if (!normalizedUrl.includes(`github.com/${normalizedHandle}/`)) {
    return t('submission.errors.repoNotOwned', { handle: props.githubHandle });
  }
  return null;
});

const effectiveRepoUrlError = computed(
  () => repoUrlHandleError.value ?? errors.value['repoUrl'],
);

// ─── Soumission ───────────────────────────────────────────────────────────────

const onSubmit = handleSubmit(async (values) => {
  submitError.value = null;

  // Vérification handle côté client avant appel API
  if (repoUrlHandleError.value) {
    return;
  }

  try {
    const result = await $fetch<SubmitDelivrableResponse>(
      `/api/me/progressions/${props.progressionId}/submit`,
      {
        method: 'POST',
        body: {
          repoUrl: values.repoUrl,
          deployUrl: values.deployUrl ?? '',
        },
      },
    );

    toast.success(t('submission.success.title'), t('submission.success.description'));
    resetForm();
    emit('submitted', result);
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; statusCode?: number };
    const serverMessage = fetchErr.data?.message ?? null;

    if (fetchErr.statusCode === 429) {
      submitError.value = t('submission.errors.spamBlocked');
    } else if (serverMessage === 'submission.errors.repoNotOwned') {
      submitError.value = t('submission.errors.repoNotOwned', {
        handle: props.githubHandle ?? '',
      });
    } else if (serverMessage === 'submission.errors.alreadyRunning') {
      submitError.value = t('submission.errors.alreadyRunning');
    } else if (serverMessage === 'submission.errors.githubHandleRequired') {
      submitError.value = t('submission.errors.githubHandleRequired');
    } else {
      submitError.value = t('errors.generic');
    }
  }
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Alerte anti-spam -->
    <UAlert
      v-if="isSpamBlocked"
      color="error"
      variant="soft"
      icon="i-tabler-ban"
      :title="t('submission.spamBlocked.title')"
      :description="t('submission.spamBlocked.description')"
      aria-live="polite"
    />

    <!-- Alerte GitHub non lié -->
    <UAlert
      v-else-if="!githubHandle"
      color="warning"
      variant="soft"
      icon="i-tabler-brand-github"
      :title="t('submission.githubRequired.title')"
      :description="t('submission.githubRequired.description')"
      aria-live="polite"
    />

    <!-- Alerte analyse en cours -->
    <UAlert
      v-else-if="isAlreadyRunning"
      color="info"
      variant="soft"
      icon="i-tabler-loader"
      :title="t('submission.alreadyRunning.title')"
      :description="t('submission.alreadyRunning.description')"
      aria-live="polite"
    />

    <!-- Alerte validation terminée -->
    <UAlert
      v-else-if="isTerminal"
      color="success"
      variant="soft"
      icon="i-tabler-circle-check"
      :title="t('submission.validated.title')"
      :description="t('submission.validated.description')"
      aria-live="polite"
    />

    <!-- Formulaire de soumission -->
    <form
      v-if="!isTerminal && !isSpamBlocked"
      class="flex flex-col gap-4"
      :aria-disabled="isDisabled"
      @submit.prevent="onSubmit"
    >
      <!-- URL du repo GitHub -->
      <AppFormField
        name="repoUrl"
        :label="t('submission.fields.repoUrl')"
        :error="effectiveRepoUrlError"
        :hint="githubHandle ? t('submission.fields.repoUrlHint', { handle: githubHandle }) : undefined"
        required
      >
        <UInput
          v-bind="repoUrlAttrs"
          :model-value="repoUrl ?? ''"
          :placeholder="t('submission.fields.repoUrlPlaceholder', { handle: githubHandle ?? 'votre-handle' })"
          icon="i-tabler-brand-github"
          type="url"
          :disabled="isDisabled"
          :aria-invalid="!!effectiveRepoUrlError"
          class="w-full"
          @update:model-value="repoUrl = $event"
        />
      </AppFormField>

      <!-- URL de déploiement (optionnel) -->
      <AppFormField
        name="deployUrl"
        :label="t('submission.fields.deployUrl')"
        :error="errors['deployUrl']"
        :hint="t('submission.fields.deployUrlHint')"
      >
        <UInput
          v-bind="deployUrlAttrs"
          :model-value="deployUrl ?? ''"
          :placeholder="t('submission.fields.deployUrlPlaceholder')"
          icon="i-tabler-world"
          type="url"
          :disabled="isDisabled"
          :aria-invalid="!!errors['deployUrl']"
          class="w-full"
          @update:model-value="deployUrl = $event"
        />
      </AppFormField>

      <!-- Erreur générale serveur -->
      <UAlert
        v-if="submitError"
        color="error"
        variant="soft"
        icon="i-tabler-alert-circle"
        :description="submitError"
        aria-live="assertive"
      />

      <!-- Bouton de soumission -->
      <div class="flex justify-end">
        <UButton
          type="submit"
          :loading="isSubmitting"
          :disabled="isDisabled"
          icon="i-tabler-send"
          color="primary"
        >
          {{ t('submission.actions.submit') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
