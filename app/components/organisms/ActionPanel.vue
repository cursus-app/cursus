<script setup lang="ts">
/**
 * ActionPanel — panneau d'actions contextuelles de la fiche stagiaire 360.
 *
 * Actions disponibles :
 *  1. Override livrable (validation manuelle ou extension d'échéance)
 *  2. Planifier un appel (lien Calendly externe)
 *  3. Marquer alerte traitée (si activeAlerts > 0)
 *
 * Validation form override : Zod côté client (symétrique avec le serveur).
 * Rate limit géré côté serveur.
 *
 * Cf. ST-13.3 — TT-13.3.4, TT-13.3.8
 */
import { z } from 'zod';

const props = defineProps<{
  stagiaireId: string;
  cohorteId: string;
  activeAlerts: number;
}>();

const emit = defineEmits<{
  /** Émis après un override réussi pour demander le rechargement de la timeline. */
  'override-done': [];
  /** Émis après la résolution d'une alerte. */
  'alert-resolved': [];
}>();

const toast = useAppToast();

// ── Override modal ────────────────────────────────────────────────────────────

const showOverrideModal = ref(false);

const OverrideSchema = z
  .object({
    submissionId: z.string().uuid({ message: 'ID de soumission invalide (UUID requis)' }),
    action: z.enum(['validate', 'extend'], { required_error: 'Choisissez une action' }),
    reason: z.string().min(5, { message: 'Le motif doit comporter au moins 5 caractères' }),
    extendDays: z.number().int().min(1).max(30).optional(),
  })
  .refine((d) => d.action !== 'extend' || (d.extendDays !== undefined && d.extendDays >= 1), {
    message: "Indiquez le nombre de jours d'extension (1–30)",
    path: ['extendDays'],
  });

type OverrideForm = z.infer<typeof OverrideSchema>;

const overrideForm = reactive<{
  submissionId: string;
  action: 'validate' | 'extend';
  reason: string;
  extendDays: number | undefined;
}>({
  submissionId: '',
  action: 'validate',
  reason: '',
  extendDays: undefined,
});

const overrideErrors = ref<Partial<Record<keyof OverrideForm | '_form', string>>>({});
const overrideLoading = ref(false);

function openOverrideModal(): void {
  overrideForm.submissionId = '';
  overrideForm.action = 'validate';
  overrideForm.reason = '';
  overrideForm.extendDays = undefined;
  overrideErrors.value = {};
  showOverrideModal.value = true;
}

function closeOverrideModal(): void {
  if (overrideLoading.value) {
    return;
  }
  showOverrideModal.value = false;
}

async function handleOverrideSubmit(): Promise<void> {
  overrideErrors.value = {};

  const parsed = OverrideSchema.safeParse({
    ...overrideForm,
    extendDays: overrideForm.extendDays !== undefined ? Number(overrideForm.extendDays) : undefined,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    for (const [key, msgs] of Object.entries(fieldErrors)) {
      const msg = msgs?.[0];
      if (msg) {
        overrideErrors.value[key as keyof OverrideForm] = msg;
      }
    }
    const formErrors = parsed.error.flatten().formErrors;
    const firstFormError = formErrors[0];
    if (firstFormError) {
      overrideErrors.value['_form'] = firstFormError;
    }
    return;
  }

  overrideLoading.value = true;
  try {
    await $fetch(`/api/stagiaires/${props.stagiaireId}/override`, {
      method: 'POST',
      body: {
        cohorteId: props.cohorteId,
        submissionId: parsed.data.submissionId,
        action: parsed.data.action,
        reason: parsed.data.reason,
        ...(parsed.data.extendDays !== undefined ? { extendDays: parsed.data.extendDays } : {}),
      },
    });

    showOverrideModal.value = false;
    emit('override-done');

    const actionLabel = parsed.data.action === 'validate' ? 'validé manuellement' : 'étendu';
    toast.success(`Override appliqué`, `Livrable ${actionLabel} avec succès.`);
  } catch (err: unknown) {
    const statusCode =
      err instanceof Error && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : undefined;
    const apiMsg =
      err instanceof Error && 'data' in err
        ? (err as { data?: { message?: unknown } }).data?.message
        : undefined;
    let msg = "Une erreur est survenue lors de l'override.";
    if (statusCode === 429) {
      msg = "Trop d'overrides effectués. Réessayez dans quelques minutes.";
    } else if (statusCode === 403) {
      msg = "Vous n'êtes pas autorisé à effectuer cet override.";
    } else if (statusCode === 404) {
      msg = "Soumission introuvable. Vérifiez l'ID.";
    } else if (typeof apiMsg === 'string') {
      msg = apiMsg;
    }
    overrideErrors.value['_form'] = msg;
    toast.danger('Override échoué', msg);
  } finally {
    overrideLoading.value = false;
  }
}

// ── Alerte — marquer traitée ──────────────────────────────────────────────────

const resolvingAlert = ref(false);

async function handleResolveAlert(): Promise<void> {
  // L'action "marquer alerte traitée" sans ID spécifique n'est pas précise.
  // Pour MVP, on notifie le formateur qu'il doit sélectionner une alerte depuis la timeline.
  toast.info(
    'Sélectionnez une alerte',
    'Cliquez sur une alerte dans la timeline pour la marquer comme traitée.',
  );
}
</script>

<template>
  <aside
    aria-label="Panneau d'actions"
    class="rounded-xl border border-border-subtle bg-surface p-4"
  >
    <h2 class="mb-4 text-sm font-semibold tracking-wide text-text-subtle uppercase">Actions</h2>

    <div class="space-y-2">
      <!-- Override livrable -->
      <UButton
        icon="i-tabler-pencil-check"
        color="warning"
        variant="soft"
        class="w-full justify-start"
        @click="openOverrideModal"
      >
        Override un livrable
      </UButton>

      <!-- Planifier un appel (lien Calendly externe, désactivé si non configuré) -->
      <UTooltip text="Lien Calendly non configuré" :disabled="false">
        <UButton
          icon="i-tabler-calendar-event"
          color="neutral"
          variant="outline"
          class="w-full justify-start"
          disabled
          aria-label="Planifier un appel (Calendly non configuré)"
        >
          Planifier un appel
        </UButton>
      </UTooltip>

      <!-- Marquer alerte traitée (uniquement si alertes actives) -->
      <UButton
        v-if="activeAlerts > 0"
        icon="i-tabler-bell-check"
        color="neutral"
        variant="outline"
        class="w-full justify-start"
        :loading="resolvingAlert"
        @click="handleResolveAlert"
      >
        Marquer alerte traitée
        <span
          class="ml-auto rounded-full bg-warning-solid px-1.5 py-0.5 text-[10px] font-bold text-text-on-warning-solid"
          aria-hidden="true"
        >
          {{ activeAlerts }}
        </span>
      </UButton>
    </div>

    <!-- Modal Override ───────────────────────────────────────────────────────── -->
    <UModal
      :open="showOverrideModal"
      @update:open="
        (v) => {
          if (!v) closeOverrideModal();
        }
      "
    >
      <template #content>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="override-panel-title"
          aria-describedby="override-panel-desc"
          class="p-6"
        >
          <!-- En-tête -->
          <div class="mb-5 flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-bg">
              <UIcon
                name="i-tabler-pencil-check"
                class="size-5 text-warning-fg"
                aria-hidden="true"
              />
            </div>
            <div class="flex-1">
              <h2 id="override-panel-title" class="text-base font-semibold text-text-strong">
                Override de livrable
              </h2>
              <p id="override-panel-desc" class="mt-0.5 text-sm text-text-muted">
                Valider manuellement ou étendre l'échéance d'un livrable.
              </p>
            </div>
            <UButton
              icon="i-tabler-x"
              color="neutral"
              variant="ghost"
              :disabled="overrideLoading"
              aria-label="Fermer"
              @click="closeOverrideModal"
            />
          </div>

          <div class="space-y-4">
            <!-- ID Soumission -->
            <div>
              <label
                for="override-submission-id"
                class="mb-1 block text-sm font-medium text-text-default"
              >
                ID de la soumission
                <span class="text-danger-fg" aria-hidden="true">*</span>
              </label>
              <UInput
                id="override-submission-id"
                v-model="overrideForm.submissionId"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                :disabled="overrideLoading"
                :status="overrideErrors.submissionId ? 'error' : undefined"
                font-mono
              />
              <p
                v-if="overrideErrors.submissionId"
                class="mt-1 text-xs text-danger-fg"
                role="alert"
              >
                {{ overrideErrors.submissionId }}
              </p>
            </div>

            <!-- Action -->
            <fieldset>
              <legend class="mb-2 block text-sm font-medium text-text-default">
                Action
                <span class="text-danger-fg" aria-hidden="true">*</span>
              </legend>
              <div class="space-y-2">
                <label class="flex cursor-pointer items-center gap-2.5">
                  <input
                    v-model="overrideForm.action"
                    type="radio"
                    value="validate"
                    :disabled="overrideLoading"
                    class="accent-accent"
                  />
                  <span class="text-sm text-text-default">Valider manuellement</span>
                </label>
                <label class="flex cursor-pointer items-center gap-2.5">
                  <input
                    v-model="overrideForm.action"
                    type="radio"
                    value="extend"
                    :disabled="overrideLoading"
                    class="accent-accent"
                  />
                  <span class="text-sm text-text-default">Étendre l'échéance</span>
                </label>
              </div>
            </fieldset>

            <!-- Nombre de jours (si extend) -->
            <div v-if="overrideForm.action === 'extend'">
              <label
                for="override-extend-days"
                class="mb-1 block text-sm font-medium text-text-default"
              >
                Nombre de jours d'extension
                <span class="text-danger-fg" aria-hidden="true">*</span>
              </label>
              <UInput
                id="override-extend-days"
                :model-value="
                  overrideForm.extendDays !== undefined ? String(overrideForm.extendDays) : ''
                "
                type="number"
                :min="1"
                :max="30"
                placeholder="7"
                :disabled="overrideLoading"
                :status="overrideErrors.extendDays ? 'error' : undefined"
                @update:model-value="
                  (v: string | number | null) => {
                    overrideForm.extendDays = v !== '' && v !== null ? Number(v) : undefined;
                  }
                "
              />
              <p v-if="overrideErrors.extendDays" class="mt-1 text-xs text-danger-fg" role="alert">
                {{ overrideErrors.extendDays }}
              </p>
            </div>

            <!-- Motif -->
            <div>
              <label for="override-reason" class="mb-1 block text-sm font-medium text-text-default">
                Motif
                <span class="text-danger-fg" aria-hidden="true">*</span>
              </label>
              <textarea
                id="override-reason"
                v-model="overrideForm.reason"
                :rows="4"
                placeholder="Expliquez la raison de cet override (min. 5 caractères)…"
                :disabled="overrideLoading"
                :aria-invalid="!!overrideErrors.reason"
                aria-describedby="override-reason-hint override-reason-error"
                class="flex w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm text-text-default transition-colors placeholder:text-text-subtle focus:ring-2 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                :class="
                  overrideErrors.reason
                    ? 'border-danger-solid focus:ring-danger-solid/20'
                    : 'border-border-subtle hover:border-border-default'
                "
              />
              <div class="mt-1 flex items-center justify-between gap-2">
                <p id="override-reason-hint" class="text-xs text-text-muted">
                  Minimum 5 caractères. Ce motif sera enregistré dans l'audit log.
                </p>
                <p
                  class="shrink-0 text-xs tabular-nums"
                  :class="overrideForm.reason.length < 5 ? 'text-text-subtle' : 'text-success-fg'"
                  aria-live="polite"
                >
                  {{ overrideForm.reason.length }}
                </p>
              </div>
              <p
                v-if="overrideErrors.reason"
                id="override-reason-error"
                class="mt-1 text-xs text-danger-fg"
                role="alert"
              >
                {{ overrideErrors.reason }}
              </p>
            </div>

            <!-- Erreur générale (API / form) -->
            <div
              v-if="overrideErrors['_form']"
              class="rounded-md border border-border-subtle bg-danger-bg px-3 py-2"
              aria-live="polite"
            >
              <p class="text-sm text-danger-fg" role="alert">
                {{ overrideErrors['_form'] }}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-5 flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="overrideLoading"
              @click="closeOverrideModal"
            >
              Annuler
            </UButton>
            <UButton
              color="warning"
              icon="i-tabler-pencil-check"
              :loading="overrideLoading"
              :disabled="overrideForm.reason.length < 5"
              @click="handleOverrideSubmit"
            >
              Appliquer l'override
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </aside>
</template>
