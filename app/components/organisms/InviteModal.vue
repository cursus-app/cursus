<script setup lang="ts">
/**
 * InviteModal — modal d'invitation de stagiaires.
 *
 * Deux modes :
 *  - "Emails" : coller des emails séparés par des virgules/retours à la ligne
 *  - "CSV"    : drag-drop ou upload d'un fichier CSV (colonnes email,prenom,nom)
 *
 * Émet `@invited` avec le résumé une fois les invitations envoyées.
 * Cf. ST-04.2 — TT-04.2.3.
 */
import Papa from 'papaparse';

const props = defineProps<{
  cohorteId: string;
  open: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  invited: [result: { invited: number; deduplicated: number; total: number }];
}>();

const { t } = useI18n();
const toast = useToast();
const { inviteEmails, loading } = useInvitation();

// ─── Onglets ──────────────────────────────────────────────────────────────────

type Tab = 'emails' | 'csv';
const activeTab = ref<Tab>('emails');

const tabs = computed(() => [
  { key: 'emails' as Tab, label: t('invitations.tabs.emails'), icon: 'i-tabler-mail' },
  { key: 'csv' as Tab, label: t('invitations.tabs.csv'), icon: 'i-tabler-table-import' },
]);

// ─── Onglet Emails ────────────────────────────────────────────────────────────

const emailsInput = ref('');

/** Extrait et valide les emails depuis la saisie libre. */
const parsedEmails = computed<string[]>(() => {
  const raw = emailsInput.value
    .split(/[,;\n\r]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  return [...new Set(raw.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))];
});

const invalidEmails = computed<string[]>(() => {
  const raw = emailsInput.value
    .split(/[,;\n\r]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  return raw.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
});

// ─── Onglet CSV ───────────────────────────────────────────────────────────────

interface CsvRow {
  email: string;
  prenom?: string;
  nom?: string;
}

interface CsvError {
  line: number;
  message: string;
}

const csvEmails = ref<string[]>([]);
const csvErrors = ref<CsvError[]>([]);
const csvFileName = ref<string | null>(null);
const isDragging = ref(false);

/** Analyse un fichier CSV et extrait les emails valides. */
function processCsvFile(file: File): void {
  csvErrors.value = [];
  csvEmails.value = [];
  csvFileName.value = file.name;

  Papa.parse<CsvRow>(file, {
    header: true,
    skipEmptyLines: true,
    complete(results) {
      const emails: string[] = [];
      const errors: CsvError[] = [];

      results.data.forEach((row, index) => {
        const lineNum = index + 2; // +2 : 1 pour header + 1-index
        const rawEmail = row.email?.trim().toLowerCase() ?? '';

        if (!rawEmail) {
          errors.push({ line: lineNum, message: t('invitations.csv.missingEmail') });
          return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
          errors.push({
            line: lineNum,
            message: t('invitations.csv.invalidEmail', { email: rawEmail }),
          });
          return;
        }

        emails.push(rawEmail);
      });

      csvEmails.value = [...new Set(emails)];
      csvErrors.value = errors;
    },
    error(err) {
      csvErrors.value = [{ line: 0, message: err.message }];
    },
  });
}

function onFileInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) { processCsvFile(file); }
}

function onDragOver(event: DragEvent): void {
  event.preventDefault();
  isDragging.value = true;
}

function onDragLeave(): void {
  isDragging.value = false;
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  isDragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (file?.name.endsWith('.csv')) {
    processCsvFile(file);
  } else {
    csvErrors.value = [{ line: 0, message: t('invitations.csv.notACsv') }];
  }
}

// ─── Confirmation > 50 ────────────────────────────────────────────────────────

const showConfirm = ref(false);
const pendingEmails = ref<string[]>([]);

/** Emails effectifs selon l'onglet actif. */
const activeEmails = computed<string[]>(() =>
  activeTab.value === 'emails' ? parsedEmails.value : csvEmails.value,
);

// ─── Résumé (aria-live) ───────────────────────────────────────────────────────

const summary = ref<{ invited: number; deduplicated: number; total: number } | null>(null);

// ─── Submit ───────────────────────────────────────────────────────────────────

async function handleSubmit(): Promise<void> {
  const emails = activeEmails.value;

  if (emails.length === 0) {
    toast.add({
      title: t('invitations.errors.emailRequired'),
      color: 'warning',
      icon: 'i-tabler-alert-triangle',
    });
    return;
  }

  if (emails.length > 50) {
    pendingEmails.value = emails;
    showConfirm.value = true;
    return;
  }

  await doInvite(emails);
}

async function doInvite(emails: string[]): Promise<void> {
  showConfirm.value = false;

  try {
    const result = await inviteEmails(props.cohorteId, emails);
    summary.value = {
      invited: result.invited.length,
      deduplicated: result.deduplicated.length,
      total: result.total,
    };
    emit('invited', summary.value);

    const toastPayload: Parameters<typeof toast.add>[0] = {
      title: t('invitations.successTitle', { count: result.invited.length }),
      color: 'success',
      icon: 'i-tabler-check',
    };
    if (result.deduplicated.length > 0) {
      toastPayload.description = t('invitations.deduplicatedNote', {
        count: result.deduplicated.length,
      });
    }
    toast.add(toastPayload);

    // Reset du formulaire après succès
    emailsInput.value = '';
    csvEmails.value = [];
    csvErrors.value = [];
    csvFileName.value = null;
    emit('update:open', false);
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    const msgKey = fetchErr.data?.message ?? 'errors.generic';
    toast.add({
      title: t(msgKey as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  }
}

// ─── Reset à la fermeture ─────────────────────────────────────────────────────

watch(
  () => props.open,
  (open) => {
    if (!open) {
      emailsInput.value = '';
      csvEmails.value = [];
      csvErrors.value = [];
      csvFileName.value = null;
      summary.value = null;
      activeTab.value = 'emails';
      showConfirm.value = false;
    }
  },
);
</script>

<template>
  <UModal :open="open" @update:open="$emit('update:open', $event)">
    <template #content>
      <div class="p-6">
        <!-- En-tête -->
        <div class="mb-5 flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-accent-subtle">
            <UIcon name="i-tabler-user-plus" class="size-5 text-accent-text" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-text-strong">
              {{ t('invitations.modalTitle') }}
            </h2>
            <p class="text-sm text-text-muted">
              {{ t('invitations.modalSubtitle') }}
            </p>
          </div>
          <UButton
            icon="i-tabler-x"
            color="neutral"
            variant="ghost"
            class="ml-auto"
            :aria-label="t('common.close')"
            @click="$emit('update:open', false)"
          />
        </div>

        <!-- Onglets -->
        <div class="mb-4 flex gap-1 rounded-lg border border-border-subtle bg-muted p-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              activeTab === tab.key
                ? 'bg-surface text-text-strong shadow-xs'
                : 'text-text-muted hover:text-text-default'
            "
            @click="activeTab = tab.key"
          >
            <UIcon :name="tab.icon" class="size-4" />
            {{ tab.label }}
          </button>
        </div>

        <!-- ─── Onglet Emails ──────────────────────────────────────────────── -->
        <div v-if="activeTab === 'emails'" class="space-y-3">
          <label class="block text-sm font-medium text-text-default" for="emails-input">
            {{ t('invitations.emailsLabel') }}
          </label>
          <UTextarea
            id="emails-input"
            v-model="emailsInput"
            :placeholder="t('invitations.emailsPlaceholder')"
            :rows="5"
            class="font-mono text-sm"
          />

          <!-- Aperçu emails valides -->
          <p v-if="parsedEmails.length > 0" class="text-sm text-text-muted">
            {{ t('invitations.emailsFound', { count: parsedEmails.length }) }}
          </p>

          <!-- Emails invalides -->
          <div
            v-if="invalidEmails.length > 0"
            class="rounded-md border border-border-subtle bg-warning-bg px-3 py-2"
          >
            <p class="mb-1 text-xs font-medium text-warning-fg">
              {{ t('invitations.invalidEmails', { count: invalidEmails.length }) }}
            </p>
            <ul class="space-y-0.5">
              <li
                v-for="email in invalidEmails.slice(0, 5)"
                :key="email"
                class="text-xs text-warning-fg"
              >
                {{ email }}
              </li>
              <li v-if="invalidEmails.length > 5" class="text-xs text-warning-fg">
                {{ t('invitations.andMore', { count: invalidEmails.length - 5 }) }}
              </li>
            </ul>
          </div>
        </div>

        <!-- ─── Onglet CSV ────────────────────────────────────────────────── -->
        <div v-else class="space-y-3">
          <!-- Zone drag-drop -->
          <div
            class="relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors"
            :class="
              isDragging
                ? 'border-accent bg-accent-subtle'
                : 'border-border-default hover:border-border-strong hover:bg-muted'
            "
            role="button"
            :aria-label="t('invitations.csv.dropzoneLabel')"
            tabindex="0"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
            @keydown.enter="($refs['csvInput'] as HTMLInputElement)?.click()"
            @keydown.space.prevent="($refs['csvInput'] as HTMLInputElement)?.click()"
            @click="($refs['csvInput'] as HTMLInputElement)?.click()"
          >
            <input
              ref="csvInput"
              type="file"
              accept=".csv,text/csv"
              class="absolute inset-0 cursor-pointer opacity-0"
              :aria-label="t('invitations.csv.fileInputLabel')"
              @change="onFileInput"
            />
            <UIcon
              :name="csvFileName ? 'i-tabler-file-check' : 'i-tabler-file-upload'"
              class="mx-auto mb-3 size-8"
              :class="csvFileName ? 'text-success-fg' : 'text-text-subtle'"
            />
            <p class="text-sm font-medium text-text-default">
              {{
                csvFileName
                  ? csvFileName
                  : t('invitations.csv.dropzone')
              }}
            </p>
            <p class="mt-1 text-xs text-text-muted">
              {{ t('invitations.csv.format') }}
            </p>
            <UButton
              v-if="!csvFileName"
              size="sm"
              color="neutral"
              variant="outline"
              class="mt-3"
              icon="i-tabler-upload"
              @click.stop="($refs['csvInput'] as HTMLInputElement)?.click()"
            >
              {{ t('invitations.csv.browse') }}
            </UButton>
          </div>

          <!-- Résultat parsing CSV -->
          <div v-if="csvEmails.length > 0 || csvErrors.length > 0" class="space-y-2">
            <p v-if="csvEmails.length > 0" class="text-sm text-text-muted">
              {{ t('invitations.emailsFound', { count: csvEmails.length }) }}
            </p>

            <!-- Erreurs CSV ligne par ligne -->
            <div
              v-if="csvErrors.length > 0"
              class="max-h-36 overflow-y-auto rounded-md border border-border-subtle bg-danger-bg px-3 py-2"
            >
              <p class="mb-1 text-xs font-medium text-danger-fg">
                {{ t('invitations.csv.errors', { count: csvErrors.length }) }}
              </p>
              <ul class="space-y-0.5">
                <li
                  v-for="err in csvErrors"
                  :key="`${err.line}-${err.message}`"
                  class="text-xs text-danger-fg"
                >
                  <span v-if="err.line > 0" class="font-medium">
                    {{ t('invitations.csv.line', { line: err.line }) }}
                  </span>
                  {{ err.message }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Résumé aria-live -->
        <div
          aria-live="polite"
          aria-atomic="true"
          class="mt-3"
        >
          <div
            v-if="summary"
            class="rounded-md border border-border-subtle bg-success-bg px-3 py-2 text-sm text-success-fg"
          >
            {{ t('invitations.summary', { invited: summary.invited, total: summary.total }) }}
            <span v-if="summary.deduplicated > 0">
              {{ t('invitations.deduplicatedNote', { count: summary.deduplicated }) }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-5 flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="loading"
            @click="$emit('update:open', false)"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            color="primary"
            icon="i-tabler-send"
            :loading="loading"
            :disabled="activeEmails.length === 0"
            @click="handleSubmit"
          >
            {{ t('invitations.sendButton', { count: activeEmails.length }) }}
          </UButton>
        </div>
      </div>

      <!-- Modal de confirmation (> 50 emails) -->
      <UModal v-model:open="showConfirm">
        <template #content>
          <div class="p-6">
            <h3 class="mb-2 text-base font-semibold text-text-strong">
              {{ t('invitations.confirm.title', { count: pendingEmails.length }) }}
            </h3>
            <p class="mb-5 text-sm text-text-muted">
              {{ t('invitations.confirm.description') }}
            </p>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="ghost"
                :disabled="loading"
                @click="showConfirm = false"
              >
                {{ t('common.cancel') }}
              </UButton>
              <UButton color="primary" :loading="loading" @click="doInvite(pendingEmails)">
                {{ t('invitations.confirm.proceed') }}
              </UButton>
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UModal>
</template>
