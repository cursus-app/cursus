<script setup lang="ts">
/**
 * BlockedButton — bouton "Je suis bloqué" avec modal d'escalade.
 *
 * Affiche un bouton permettant au stagiaire de signaler un blocage sur
 * un module. Ouvre une modal avec un textarea (20–500 chars) puis appelle
 * POST /api/me/progressions/:progressionId/alert.
 *
 * A11y :
 *   - Modal : role="dialog", aria-modal="true", aria-labelledby, aria-describedby
 *   - Focus trap dans la modal (focus revient au bouton à la fermeture)
 *   - ESC ferme la modal
 *   - Toast aria-live="polite"
 *   - Compteur de caractères aria-live="polite"
 *   - Target touch ≥ 44px, contraste 4.5:1
 *
 * Props :
 *   - progressionId : string — ID de la progression concernée
 *   - moduleTitle   : string — Titre du module (affiché dans la modal)
 *   - disabled      : boolean — Désactive le bouton (ex: alerte déjà ouverte)
 */

interface Props {
  progressionId: string;
  moduleTitle: string;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<{
  alertSent: [alertId: string];
}>();

const { t } = useI18n();

// ─── State ────────────────────────────────────────────────────────────────────

const isOpen = ref(false);
const message = ref('');
const isSubmitting = ref(false);
const toastMessage = ref<string | null>(null);
const toastVariant = ref<'success' | 'danger'>('success');

// Désactivé 24h après un envoi réussi (stocké en localStorage)
const sentAt = useLocalStorage<number | null>(`blocked-sent:${props.progressionId}`, null);
const isAlreadySent = computed(() => {
  if (sentAt.value === null) {return false;}
  return Date.now() - sentAt.value < 24 * 60 * 60 * 1_000;
});

const isButtonDisabled = computed(
  () => props.disabled || isAlreadySent.value || isSubmitting.value,
);

// ─── Validation ───────────────────────────────────────────────────────────────

const MIN_LENGTH = 20;
const MAX_LENGTH = 500;

const charCount = computed(() => message.value.length);
const isValid = computed(() => charCount.value >= MIN_LENGTH && charCount.value <= MAX_LENGTH);
const isOverMax = computed(() => charCount.value > MAX_LENGTH);

const charCountLabel = computed(() => {
  const remaining = MAX_LENGTH - charCount.value;
  if (isOverMax.value) {
    return t('blocked.modal.charOverMax', { count: Math.abs(remaining) });
  }
  if (charCount.value < MIN_LENGTH) {
    return t('blocked.modal.charRemaining', { count: MIN_LENGTH - charCount.value });
  }
  return t('blocked.modal.charCount', { count: charCount.value, max: MAX_LENGTH });
});

// ─── Refs DOM pour focus trap ─────────────────────────────────────────────────

const openButtonRef = ref<HTMLButtonElement | null>(null);
const modalRef = ref<HTMLDivElement | null>(null);
const firstFocusableRef = ref<HTMLTextAreaElement | null>(null);
const cancelButtonRef = ref<HTMLButtonElement | null>(null);

// ─── Modal open / close ───────────────────────────────────────────────────────

function openModal() {
  if (isButtonDisabled.value) {return;}
  message.value = '';
  isOpen.value = true;
  nextTick(() => {
    firstFocusableRef.value?.focus();
  });
}

function closeModal() {
  isOpen.value = false;
  message.value = '';
  nextTick(() => {
    openButtonRef.value?.focus();
  });
}

// ─── Focus trap (Tab / Shift+Tab dans la modal) ───────────────────────────────

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeModal();
    return;
  }

  if (event.key !== 'Tab') {return;}

  const modal = modalRef.value;
  if (!modal) {return;}

  const focusable = modal.querySelectorAll<HTMLElement>(
    'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
}

// ─── Soumission ───────────────────────────────────────────────────────────────

async function submit() {
  if (!isValid.value || isSubmitting.value) {return;}

  isSubmitting.value = true;
  toastMessage.value = null;

  try {
    const data = await $fetch<{ alertId: string; duplicate: boolean }>(
      `/api/me/progressions/${props.progressionId}/alert`,
      {
        method: 'POST',
        body: { message: message.value },
      },
    );

    if (data.duplicate) {
      toastVariant.value = 'danger';
      toastMessage.value = t('blocked.toast.alreadyOpen');
      closeModal();
      return;
    }

    sentAt.value = Date.now();
    toastVariant.value = 'success';
    toastMessage.value = t('blocked.toast.success');
    emit('alertSent', data.alertId);
    closeModal();
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 429) {
      toastVariant.value = 'danger';
      toastMessage.value = t('blocked.toast.rateLimited');
    } else {
      toastVariant.value = 'danger';
      toastMessage.value = t('blocked.toast.error');
    }
  } finally {
    isSubmitting.value = false;
  }
}

// Fermer le toast après 4s
watch(toastMessage, (val) => {
  if (val) {
    setTimeout(() => {
      toastMessage.value = null;
    }, 4_000);
  }
});
</script>

<template>
  <div>
    <!-- Bouton principal -->
    <UButton
      ref="openButtonRef"
      color="warning"
      variant="soft"
      :disabled="isButtonDisabled"
      :aria-label="
        isAlreadySent ? t('blocked.button.alreadySentLabel') : t('blocked.button.label')
      "
      class="min-h-[44px]"
      @click="openModal"
    >
      <template #leading>
        <span class="i-tabler-hand-stop" aria-hidden="true" />
      </template>
      {{ isAlreadySent ? t('blocked.button.alreadySent') : t('blocked.button.label') }}
    </UButton>

    <!-- Toast aria-live -->
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      class="fixed bottom-6 right-6 z-[60] max-w-sm"
    >
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
      >
        <AppAlert
          v-if="toastMessage"
          :variant="toastVariant"
          :description="toastMessage"
          dismissible
          @close="toastMessage = null"
        />
      </Transition>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          @keydown="handleKeydown"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/50"
            aria-hidden="true"
            @click="closeModal"
          />

          <!-- Panel -->
          <div
            ref="modalRef"
            role="dialog"
            aria-labelledby="blocked-modal-title"
            aria-describedby="blocked-modal-desc"
            class="relative z-10 w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-border-subtle"
          >
            <!-- En-tête -->
            <div class="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="blocked-modal-title"
                  class="text-lg font-semibold text-text-strong"
                >
                  {{ t('blocked.modal.title') }}
                </h2>
                <p
                  id="blocked-modal-desc"
                  class="mt-1 text-sm text-text-muted"
                >
                  {{ t('blocked.modal.subtitle', { module: props.moduleTitle }) }}
                </p>
              </div>
              <button
                type="button"
                :aria-label="t('common.close')"
                class="shrink-0 rounded p-1 text-text-subtle transition-colors hover:text-text-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                @click="closeModal"
              >
                <span class="i-tabler-x size-5" aria-hidden="true" />
              </button>
            </div>

            <!-- Textarea -->
            <label for="blocked-message" class="block text-sm font-medium text-text-default mb-1">
              {{ t('blocked.modal.label') }}
            </label>
            <textarea
              id="blocked-message"
              ref="firstFocusableRef"
              v-model="message"
              :placeholder="t('blocked.modal.placeholder')"
              :maxlength="MAX_LENGTH + 50"
              :aria-describedby="`blocked-char-count ${!isValid && message.length > 0 ? 'blocked-error' : ''}`"
              :aria-invalid="message.length > 0 && !isValid"
              class="mt-1 w-full rounded-lg border border-border-subtle bg-app px-3 py-2 text-sm text-text-default placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-ring resize-none transition"
              rows="4"
            />

            <!-- Compteur de caractères + erreur -->
            <div class="mt-1 flex items-center justify-between gap-2">
              <p
                v-if="message.length > 0 && charCount < MIN_LENGTH"
                id="blocked-error"
                class="text-xs text-danger-fg"
                role="alert"
              >
                {{ t('blocked.modal.minLengthError', { min: MIN_LENGTH }) }}
              </p>
              <span v-else class="flex-1" />

              <p
                id="blocked-char-count"
                aria-live="polite"
                aria-atomic="true"
                :class="[
                  'text-xs shrink-0',
                  isOverMax ? 'text-danger-fg font-medium' : 'text-text-subtle',
                ]"
              >
                {{ charCountLabel }}
              </p>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex justify-end gap-3">
              <UButton
                ref="cancelButtonRef"
                color="neutral"
                variant="ghost"
                :label="t('common.cancel')"
                :disabled="isSubmitting"
                @click="closeModal"
              />
              <UButton
                color="warning"
                variant="solid"
                :label="isSubmitting ? t('blocked.modal.submitting') : t('blocked.modal.submit')"
                :disabled="!isValid || isSubmitting"
                :loading="isSubmitting"
                :aria-label="t('blocked.modal.submitAriaLabel')"
                class="min-h-[44px]"
                @click="submit"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
