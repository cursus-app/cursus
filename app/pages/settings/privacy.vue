<script setup lang="ts">
// Page Paramètres > Confidentialité — ST-15.1 (export) + ST-15.2 (suppression)
// Design tokens uniquement. Dark mode natif via tokens. i18n via useT().
import type { GdprQueuedResponse } from '~~/shared/schemas/gdpr';

const { t } = useT();

useSeoMeta({
  title: t('settings.privacy.title'),
  robots: 'noindex',
});

// ---- État export (ST-15.1) ----
const EXPORT_COOLDOWN_KEY = 'gdpr_export_requested_at';
const EXPORT_COOLDOWN_DAYS = 7;

const exportStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const exportMessage = ref('');

const exportCooldownRemaining = computed(() => {
  if (import.meta.server) {
    return 0;
  }
  const stored = localStorage.getItem(EXPORT_COOLDOWN_KEY);
  if (!stored) {
    return 0;
  }
  const elapsed = Date.now() - parseInt(stored, 10);
  const cooldownMs = EXPORT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  if (elapsed >= cooldownMs) {
    return 0;
  }
  return Math.ceil((cooldownMs - elapsed) / (60 * 60 * 1000)); // heures restantes
});

const isExportDisabled = computed(
  () => exportCooldownRemaining.value > 0 || exportStatus.value === 'loading',
);

async function requestExport() {
  exportStatus.value = 'loading';
  exportMessage.value = '';

  try {
    const data = await $fetch<GdprQueuedResponse>('/api/me/export', {
      method: 'POST',
    });
    exportStatus.value = 'success';
    exportMessage.value = data.message;
    localStorage.setItem(EXPORT_COOLDOWN_KEY, String(Date.now()));
  } catch (err: unknown) {
    exportStatus.value = 'error';
    if (err && typeof err === 'object' && 'statusMessage' in err) {
      exportMessage.value = String((err as { statusMessage: string }).statusMessage);
    } else {
      exportMessage.value = t('errors.generic');
    }
  }
}

// ---- État suppression (ST-15.2) ----
const showDeleteModal = ref(false);
const confirmationText = ref('');
const deleteStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const deleteMessage = ref('');

const CONFIRMATION_PHRASE = 'SUPPRIMER MON COMPTE';
const isConfirmationValid = computed(() => confirmationText.value === CONFIRMATION_PHRASE);

const isDeleteDisabled = computed(
  () => !isConfirmationValid.value || deleteStatus.value === 'loading',
);

function openDeleteModal() {
  confirmationText.value = '';
  deleteStatus.value = 'idle';
  deleteMessage.value = '';
  showDeleteModal.value = true;
}

function closeDeleteModal() {
  showDeleteModal.value = false;
}

async function confirmDelete() {
  if (!isConfirmationValid.value) {
    return;
  }

  deleteStatus.value = 'loading';
  deleteMessage.value = '';

  try {
    const data = await $fetch<GdprQueuedResponse>('/api/me/delete', {
      method: 'POST',
      body: { confirmation: CONFIRMATION_PHRASE },
    });
    deleteStatus.value = 'success';
    deleteMessage.value = data.message;
    closeDeleteModal();
  } catch (err: unknown) {
    deleteStatus.value = 'error';
    if (err && typeof err === 'object' && 'statusMessage' in err) {
      deleteMessage.value = String((err as { statusMessage: string }).statusMessage);
    } else {
      deleteMessage.value = t('errors.generic');
    }
    closeDeleteModal();
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-12">
    <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
      {{ t('settings.privacy.title') }}
    </h1>
    <p class="mt-2 text-sm text-text-muted">
      {{ t('settings.privacy.subtitle') }}
    </p>

    <!-- ====== Section : Vos données (ST-15.1) ====== -->
    <section class="mt-10 rounded-lg border border-border-subtle bg-surface p-6">
      <div class="flex items-start gap-3">
        <span class="i-tabler-shield-check mt-0.5 h-5 w-5 shrink-0 text-accent-text" />
        <div class="flex-1">
          <h2 class="text-base font-medium text-text-strong">
            {{ t('settings.privacy.export.title') }}
          </h2>
          <p class="mt-1 text-sm text-text-muted">
            {{ t('settings.privacy.export.description') }}
          </p>

          <!-- Message succès / erreur export -->
          <div
            v-if="exportStatus === 'success'"
            role="status"
            aria-live="polite"
            class="mt-4 rounded-md border border-border-subtle bg-success-bg px-4 py-3 text-sm text-success-fg"
          >
            <span class="i-tabler-circle-check mr-2 inline-block h-4 w-4 align-middle" />
            {{ exportMessage }}
          </div>
          <div
            v-else-if="exportStatus === 'error'"
            role="alert"
            class="mt-4 rounded-md border border-border-subtle bg-danger-bg px-4 py-3 text-sm text-danger-fg"
          >
            <span class="i-tabler-alert-circle mr-2 inline-block h-4 w-4 align-middle" />
            {{ exportMessage }}
          </div>

          <!-- Message cooldown -->
          <p
            v-if="exportCooldownRemaining > 0 && exportStatus !== 'success'"
            class="mt-3 text-xs text-text-muted"
          >
            <span class="i-tabler-clock mr-1 inline-block h-3.5 w-3.5 align-middle" />
            {{ t('settings.privacy.export.cooldown', { hours: exportCooldownRemaining }) }}
          </p>

          <div class="mt-4">
            <UButton
              icon="i-tabler-download"
              :loading="exportStatus === 'loading'"
              :disabled="isExportDisabled"
              :aria-label="t('settings.privacy.export.button')"
              @click="requestExport"
            >
              {{ t('settings.privacy.export.button') }}
            </UButton>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== Section : Danger zone / suppression (ST-15.2) ====== -->
    <section class="mt-6 rounded-lg border border-border-subtle bg-danger-bg p-6">
      <div class="flex items-start gap-3">
        <span class="i-tabler-trash mt-0.5 h-5 w-5 shrink-0 text-danger-fg" />
        <div class="flex-1">
          <h2 class="text-base font-medium text-danger-fg">
            {{ t('settings.privacy.delete.title') }}
          </h2>
          <p class="mt-1 text-sm text-danger-fg opacity-80">
            {{ t('settings.privacy.delete.description') }}
          </p>

          <!-- Message succès / erreur suppression -->
          <div
            v-if="deleteStatus === 'success'"
            role="status"
            aria-live="polite"
            class="mt-4 rounded-md bg-success-bg px-4 py-3 text-sm text-success-fg"
          >
            <span class="i-tabler-circle-check mr-2 inline-block h-4 w-4 align-middle" />
            {{ deleteMessage }}
          </div>
          <div
            v-else-if="deleteStatus === 'error'"
            role="alert"
            class="mt-4 rounded-md bg-surface px-4 py-3 text-sm text-danger-fg"
          >
            <span class="i-tabler-alert-circle mr-2 inline-block h-4 w-4 align-middle" />
            {{ deleteMessage }}
          </div>

          <div class="mt-4">
            <UButton
              icon="i-tabler-trash"
              color="error"
              variant="soft"
              :aria-label="t('settings.privacy.delete.button')"
              @click="openDeleteModal"
            >
              {{ t('settings.privacy.delete.button') }}
            </UButton>
          </div>
        </div>
      </div>
    </section>

    <!-- ====== Modal de confirmation de suppression (ST-15.2) ====== -->
    <UModal
      v-model:open="showDeleteModal"
      :title="t('settings.privacy.delete.modal.title')"
      role="alertdialog"
      :aria-label="t('settings.privacy.delete.modal.title')"
      :ui="{ overlay: 'bg-app/80' }"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Avertissements -->
          <div class="rounded-md border border-border-subtle bg-danger-bg p-4">
            <p class="text-sm font-medium text-danger-fg">
              {{ t('settings.privacy.delete.modal.warning') }}
            </p>
            <ul class="mt-2 space-y-1 text-xs text-danger-fg opacity-80">
              <li class="flex items-center gap-2">
                <span class="i-tabler-x h-3.5 w-3.5 shrink-0" />
                {{ t('settings.privacy.delete.modal.items.submissions') }}
              </li>
              <li class="flex items-center gap-2">
                <span class="i-tabler-x h-3.5 w-3.5 shrink-0" />
                {{ t('settings.privacy.delete.modal.items.profile') }}
              </li>
              <li class="flex items-center gap-2">
                <span class="i-tabler-check h-3.5 w-3.5 shrink-0 text-success-fg" />
                {{ t('settings.privacy.delete.modal.items.certificates') }}
              </li>
            </ul>
          </div>

          <!-- Champ de confirmation -->
          <div>
            <label for="delete-confirmation" class="block text-sm font-medium text-text-default">
              {{
                t('settings.privacy.delete.modal.confirmLabel', { phrase: 'SUPPRIMER MON COMPTE' })
              }}
            </label>
            <UInput
              id="delete-confirmation"
              v-model="confirmationText"
              class="mt-2"
              :placeholder="t('settings.privacy.delete.modal.confirmPlaceholder')"
              autocomplete="off"
              :aria-describedby="
                !isConfirmationValid && confirmationText.length > 0 ? 'confirm-error' : undefined
              "
            />
            <p
              v-if="!isConfirmationValid && confirmationText.length > 0"
              id="confirm-error"
              class="mt-1 text-xs text-danger-fg"
              role="alert"
            >
              {{ t('settings.privacy.delete.modal.confirmError') }}
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton variant="ghost" @click="closeDeleteModal">
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            icon="i-tabler-trash"
            color="error"
            :loading="deleteStatus === 'loading'"
            :disabled="isDeleteDisabled"
            :aria-label="t('settings.privacy.delete.modal.confirmButton')"
            @click="confirmDelete"
          >
            {{ t('settings.privacy.delete.modal.confirmButton') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
