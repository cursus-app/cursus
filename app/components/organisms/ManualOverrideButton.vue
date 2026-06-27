<script setup lang="ts">
/**
 * ManualOverrideButton — bouton + modal d'override manuel (ST-06.5).
 *
 * Affiché uniquement pour les FORMATEUR_PRINCIPAL / CO_FORMATEUR de la cohorte.
 * Ouvre une modal avec textarea motif (min 20, max 500 chars).
 * Appelle PATCH /api/progressions/:id/transition { to: 'VALIDE_OVERRIDE', reason }.
 * Émet 'overridden' une fois la progression mise à jour.
 * Crée une notification côté stagiaire via POST /api/notifications.
 */

const props = defineProps<{
  /** ID de la Progression à override. */
  progressionId: string;
  /** Statut actuel — pour vérifier si l'override est encore possible. */
  currentStatus: string;
  /** Nom du stagiaire (pour le toast). */
  traineeName?: string | null;
}>();

const emit = defineEmits<{
  /** Émis avec la progression mise à jour après override réussi. */
  overridden: [progression: { id: string; status: string; overrideReason: string | null }];
}>();

const { t } = useI18n();
const toast = useToast();

// ─── État local ───────────────────────────────────────────────────────────────

const isOpen = ref(false);
const reason = ref('');
const loading = ref(false);
const errorMsg = ref<string | null>(null);

/** L'override n'est pas possible si la progression est déjà terminale. */
const isTerminal = computed(
  () => props.currentStatus === 'VALIDE' || props.currentStatus === 'VALIDE_OVERRIDE',
);

// ─── Validation locale ────────────────────────────────────────────────────────

const MIN_REASON = 20;
const MAX_REASON = 500;

const charCount = computed(() => reason.value.length);

const reasonError = computed<string | null>(() => {
  if (reason.value.length === 0) {
    return null; // pas encore touché
  }
  if (reason.value.length < MIN_REASON) {
    return t('override.modal.reasonTooShort', { min: MIN_REASON });
  }
  if (reason.value.length > MAX_REASON) {
    return t('override.modal.reasonTooLong', { max: MAX_REASON });
  }
  return null;
});

const canSubmit = computed(
  () => reason.value.length >= MIN_REASON && reason.value.length <= MAX_REASON && !loading.value,
);

// ─── Actions ──────────────────────────────────────────────────────────────────

function openModal(): void {
  reason.value = '';
  errorMsg.value = null;
  isOpen.value = true;
}

function closeModal(): void {
  if (loading.value) {
    return;
  }
  isOpen.value = false;
}

async function handleSubmit(): Promise<void> {
  if (!canSubmit.value) {
    return;
  }

  loading.value = true;
  errorMsg.value = null;

  try {
    const updated = await $fetch<{
      id: string;
      status: string;
      overrideReason: string | null;
    }>(`/api/progressions/${props.progressionId}/transition`, {
      method: 'PATCH',
      body: { to: 'VALIDE_OVERRIDE', reason: reason.value.trim() },
    });

    emit('overridden', updated);
    isOpen.value = false;

    toast.add({
      title: t('override.toast.success'),
      ...(props.traineeName
        ? { description: t('override.toast.successDetail', { name: props.traineeName }) }
        : {}),
      color: 'success',
      icon: 'i-tabler-check',
    });
  } catch (err: unknown) {
    const fetchErr = err as {
      data?: { message?: string };
      statusCode?: number;
    };

    const statusCode = fetchErr.statusCode ?? 0;
    let messageKey = 'override.errors.generic';

    if (statusCode === 403) {
      messageKey = 'override.errors.forbidden';
    } else if (statusCode === 422) {
      messageKey = 'override.errors.alreadyTerminal';
    }

    errorMsg.value = t(messageKey as Parameters<typeof t>[0]);

    toast.add({
      title: t('override.errors.title'),
      description: errorMsg.value,
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  } finally {
    loading.value = false;
  }
}

// ─── Reset à la fermeture ─────────────────────────────────────────────────────

watch(isOpen, (open) => {
  if (!open) {
    reason.value = '';
    errorMsg.value = null;
  }
});
</script>

<template>
  <!-- Bouton masqué si déjà terminal -->
  <div v-if="!isTerminal">
    <UButton
      color="warning"
      variant="outline"
      icon="i-tabler-pencil-check"
      :aria-label="t('override.button.ariaLabel')"
      @click="openModal"
    >
      {{ t('override.button.label') }}
    </UButton>
  </div>

  <!-- Modal d'override -->
  <UModal
    :open="isOpen"
    @update:open="
      (v) => {
        if (!v) closeModal();
      }
    "
  >
    <template #content>
      <div
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`override-modal-title`"
        :aria-describedby="`override-modal-desc`"
        class="p-6"
      >
        <!-- En-tête -->
        <div class="mb-5 flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-bg">
            <span class="i-tabler-pencil-check size-5 text-warning-fg" aria-hidden="true" />
          </div>
          <div class="flex-1">
            <h2 id="override-modal-title" class="text-base font-semibold text-text-strong">
              {{ t('override.modal.title') }}
            </h2>
            <p id="override-modal-desc" class="mt-0.5 text-sm text-text-muted">
              {{ t('override.modal.description') }}
            </p>
          </div>
          <UButton
            icon="i-tabler-x"
            color="neutral"
            variant="ghost"
            :disabled="loading"
            :aria-label="t('common.close')"
            @click="closeModal"
          />
        </div>

        <!-- Textarea motif -->
        <div class="space-y-1.5">
          <label for="override-reason" class="block text-sm font-medium text-text-default">
            {{ t('override.modal.reasonLabel') }}
            <span class="text-danger-fg" aria-hidden="true">*</span>
          </label>
          <textarea
            id="override-reason"
            v-model="reason"
            :placeholder="t('override.modal.reasonPlaceholder')"
            :disabled="loading"
            :rows="5"
            :maxlength="MAX_REASON"
            :aria-required="true"
            :aria-invalid="!!reasonError"
            aria-describedby="override-reason-hint override-reason-error"
            class="flex w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm text-text-default transition-colors placeholder:text-text-subtle focus:ring-2 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              reasonError
                ? 'border-danger-solid focus:ring-danger-solid/20'
                : 'border-border-subtle hover:border-border-default'
            "
          />
          <!-- Compteur de caractères + hint -->
          <div class="flex items-start justify-between gap-2">
            <p id="override-reason-hint" class="text-xs text-text-muted">
              {{ t('override.modal.reasonHint', { min: MIN_REASON }) }}
            </p>
            <p
              class="shrink-0 text-xs tabular-nums"
              :class="charCount > MAX_REASON ? 'text-danger-fg' : 'text-text-subtle'"
              aria-live="polite"
              aria-atomic="true"
            >
              {{ charCount }}&thinsp;/&thinsp;{{ MAX_REASON }}
            </p>
          </div>
          <!-- Message d'erreur validation -->
          <p
            v-if="reasonError"
            id="override-reason-error"
            role="alert"
            class="text-xs text-danger-fg"
          >
            {{ reasonError }}
          </p>
        </div>

        <!-- Erreur API -->
        <div
          v-if="errorMsg"
          class="mt-3 rounded-md border border-border-subtle bg-danger-bg px-3 py-2"
        >
          <p class="text-sm text-danger-fg" role="alert">{{ errorMsg }}</p>
        </div>

        <!-- Actions -->
        <div class="mt-5 flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" :disabled="loading" @click="closeModal">
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="warning"
            icon="i-tabler-pencil-check"
            :loading="loading"
            :disabled="!canSubmit"
            @click="handleSubmit"
          >
            {{ t('override.modal.submitButton') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
