<script setup lang="ts">
/**
 * DelivrableEditor — éditeur de livrable et de checks harnais.
 * Cf. ST-03.4 — TT-03.4.2 (CheckList), TT-03.4.3 (YAML preview), TT-03.4.6 (markdown preview).
 *
 * - Description markdown avec live preview (debounce 200ms).
 * - Liste de checks harnais toggleables avec leurs paramètres.
 * - Bouton "Prévisualiser le workflow" → modal YAML.
 * - Warnings a11y (aria-live) : aucun check, aucun test, trop de checks.
 */
import type { DeliverableSpec, HarnessCheck } from '~~/shared/schemas/module';
import {
  generateWorkflowYaml,
  CHECK_TYPES_ORDERED,
  defaultCheckForType,
} from '~~/shared/utils/generateWorkflowYaml';
import type { WorkflowWarning } from '~~/shared/utils/generateWorkflowYaml';

// ─── Props & Emits ────────────────────────────────────────────────────────────

interface Props {
  modelValue: DeliverableSpec;
  moduleTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  moduleTitle: 'Module',
});

const emit = defineEmits<{
  'update:modelValue': [value: DeliverableSpec];
}>();

// ─── i18n ─────────────────────────────────────────────────────────────────────

const { t } = useI18n();

// ─── État local ───────────────────────────────────────────────────────────────

const showDescPreview = ref(false);
const showYamlModal = ref(false);

// Initialise les checks : on garde la liste du modèle, et on s'assure que chaque
// type de la bibliothèque est représenté (pour l'affichage de la checklist).
function buildChecks(spec: DeliverableSpec): HarnessCheck[] {
  const byType = new Map<string, HarnessCheck>(spec.checks.map((c) => [c.type, c]));
  return CHECK_TYPES_ORDERED.map((type) => byType.get(type) ?? defaultCheckForType(type));
}

const allChecks = ref<HarnessCheck[]>(buildChecks(props.modelValue));

// Resync si le parent met à jour le modèle.
watch(
  () => props.modelValue,
  (v) => {
    allChecks.value = buildChecks(v);
  },
  { deep: true },
);

// ─── Description markdown ────────────────────────────────────────────────────

const descriptionInput = ref(props.modelValue.description);

// Prévisualisation markdown : escape basique (pas de lib externe) + <br>
const descriptionPreview = computed(() =>
  descriptionInput.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>'),
);

const emitDebounced = useDebounceFn(() => {
  emit('update:modelValue', {
    ...props.modelValue,
    description: descriptionInput.value,
    checks: activeChecks.value,
  });
}, 200);

function onDescriptionChange(v: string): void {
  descriptionInput.value = v;
  emitDebounced();
}

// ─── Checks ───────────────────────────────────────────────────────────────────

const activeChecks = computed(() => allChecks.value.filter((c) => c.enabled));

function toggleCheck(type: HarnessCheck['type']): void {
  allChecks.value = allChecks.value.map((c) =>
    c.type === type ? { ...c, enabled: !c.enabled } : c,
  ) as HarnessCheck[];
  emitChecks();
}

function emitChecks(): void {
  emit('update:modelValue', {
    ...props.modelValue,
    description: descriptionInput.value,
    checks: activeChecks.value,
  });
}

// Mise à jour des paramètres d'un check "branches"
function updateBranchesParam(rawValue: string): void {
  const branches = rawValue
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
  allChecks.value = allChecks.value.map((c) =>
    c.type === 'branches' ? { ...c, params: { branches } } : c,
  ) as HarnessCheck[];
  emitChecks();
}

// Mise à jour du score minimal Lighthouse
function updateLighthouseScore(rawValue: string): void {
  const minScore = Math.min(100, Math.max(0, Number(rawValue)));
  allChecks.value = allChecks.value.map((c) =>
    c.type === 'lighthouse_score' ? { ...c, params: { ...c.params, minScore } } : c,
  ) as HarnessCheck[];
  emitChecks();
}

// Mise à jour de l'URL de déploiement (check deploy_up)
function updateDeployUrl(rawValue: string): void {
  allChecks.value = allChecks.value.map((c) =>
    c.type === 'deploy_up' ? { ...c, params: { ...(rawValue ? { url: rawValue } : {}) } } : c,
  ) as HarnessCheck[];
  emitChecks();
}

// ─── YAML preview ─────────────────────────────────────────────────────────────

const yamlResult = computed(() =>
  generateWorkflowYaml(
    {
      ...props.modelValue,
      description: descriptionInput.value,
      checks: activeChecks.value,
    },
    props.moduleTitle,
  ),
);

const yamlWarnings = computed<WorkflowWarning[]>(() => yamlResult.value.warnings);
const yamlContent = computed<string>(() => yamlResult.value.yaml);

// ─── Check labels (i18n) ──────────────────────────────────────────────────────

function getCheckLabel(type: HarnessCheck['type']): string {
  const labels: Record<HarnessCheck['type'], string> = {
    branches: t('cursus.modules.delivrable.checks.branches'),
    linter_pass: t('cursus.modules.delivrable.checks.linter_pass'),
    readme_present: t('cursus.modules.delivrable.checks.readme_present'),
    signed_commits: t('cursus.modules.delivrable.checks.signed_commits'),
    tests_pass: t('cursus.modules.delivrable.checks.tests_pass'),
    deploy_up: t('cursus.modules.delivrable.checks.deploy_up'),
    lighthouse_score: t('cursus.modules.delivrable.checks.lighthouse_score'),
  };
  return labels[type];
}

const CHECK_ICONS: Record<HarnessCheck['type'], string> = {
  branches: 'i-tabler-git-branch',
  linter_pass: 'i-tabler-check',
  readme_present: 'i-tabler-file-text',
  signed_commits: 'i-tabler-certificate',
  tests_pass: 'i-tabler-test-pipe',
  deploy_up: 'i-tabler-server',
  lighthouse_score: 'i-tabler-gauge',
};

// Récupère le check courant par type (pour la lecture des params dans le template)
function getCheck(type: HarnessCheck['type']): HarnessCheck | undefined {
  return allChecks.value.find((c) => c.type === type);
}

function getCheckBranches(): string {
  const c = getCheck('branches');
  return c?.type === 'branches' ? c.params.branches.join(', ') : 'main';
}

function getCheckLighthouseScore(): number {
  const c = getCheck('lighthouse_score');
  return c?.type === 'lighthouse_score' ? c.params.minScore : 80;
}

function getCheckDeployUrl(): string {
  const c = getCheck('deploy_up');
  return c?.type === 'deploy_up' && c.params.url ? c.params.url : '';
}

// ─── A11y: live region pour warnings ─────────────────────────────────────────

const warningMessage = computed<string>(() => {
  if (yamlWarnings.value.length === 0) {
    return '';
  }
  return yamlWarnings.value.map((w) => w.message).join(' ');
});
</script>

<template>
  <div class="space-y-6">
    <!-- Description markdown -->
    <div>
      <div class="mb-1.5 flex items-center justify-between">
        <label class="text-sm font-medium text-text-strong" for="delivrable-desc">
          {{ t('cursus.modules.delivrable.descriptionLabel') }}
        </label>
        <button
          type="button"
          class="flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-default"
          :aria-pressed="showDescPreview"
          @click="showDescPreview = !showDescPreview"
        >
          <UIcon name="i-tabler-eye" class="size-3.5" />
          {{ showDescPreview ? t('cursus.modules.delivrable.edit') : t('cursus.modules.delivrable.preview') }}
        </button>
      </div>

      <!-- Preview markdown — contenus échappés + <br>, aucun XSS possible -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        v-if="showDescPreview"
        class="min-h-24 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-default"
        aria-live="polite"
        :aria-label="t('cursus.modules.delivrable.descriptionPreviewAriaLabel')"
        v-html="descriptionPreview"
      />

      <CTextarea
        v-else
        id="delivrable-desc"
        :model-value="descriptionInput"
        :placeholder="t('cursus.modules.delivrable.descriptionPlaceholder')"
        :rows="4"
        @update:model-value="onDescriptionChange"
      />
      <span class="mt-0.5 block text-xs text-text-subtle">
        {{ t('cursus.modules.delivrable.charCount', { count: descriptionInput.length }) }}
      </span>
    </div>

    <!-- Checks harnais -->
    <div>
      <p class="mb-3 text-sm font-medium text-text-strong">
        {{ t('cursus.modules.delivrable.checksTitle') }}
      </p>

      <!-- Warning a11y — aria-live pour les lecteurs d'écran -->
      <div
        v-if="warningMessage"
        role="alert"
        aria-live="polite"
        class="mb-3 flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg"
      >
        <UIcon name="i-tabler-alert-triangle" class="mt-0.5 size-4 shrink-0" />
        <span>{{ warningMessage }}</span>
      </div>

      <div class="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-surface">
        <div v-for="type in CHECK_TYPES_ORDERED" :key="type" class="px-4 py-3">
          <!-- Toggle row -->
          <div class="flex items-center gap-3">
            <CSwitch
              :model-value="getCheck(type)?.enabled ?? false"
              :aria-label="t('cursus.modules.delivrable.toggleCheckAriaLabel', { label: getCheckLabel(type) })"
              @update:model-value="() => toggleCheck(type)"
            />
            <UIcon :name="CHECK_ICONS[type]" class="size-4 text-text-muted" />
            <span class="flex-1 text-sm text-text-default">{{ getCheckLabel(type) }}</span>
          </div>

          <!-- Paramètres conditionnels (visibles quand le check est actif) -->
          <div v-if="getCheck(type)?.enabled" class="mt-3 ml-10 space-y-2">
            <!-- Branches -->
            <template v-if="type === 'branches'">
              <CInput
                :model-value="getCheckBranches()"
                :label="t('cursus.modules.delivrable.branchesLabel')"
                :placeholder="t('cursus.modules.delivrable.branchesPlaceholder')"
                @update:model-value="updateBranchesParam"
              />
              <p class="text-xs text-text-subtle">
                {{ t('cursus.modules.delivrable.branchesExampleLabel') }}
                <code>main, develop, feature/auth</code>
              </p>
            </template>

            <!-- Lighthouse score -->
            <template v-else-if="type === 'lighthouse_score'">
              <CInput
                :model-value="String(getCheckLighthouseScore())"
                type="number"
                :label="t('cursus.modules.delivrable.lighthouseLabel')"
                :placeholder="t('cursus.modules.delivrable.lighthousePlaceholder')"
                @update:model-value="updateLighthouseScore"
              />
            </template>

            <!-- Deploy up — URL optionnelle -->
            <template v-else-if="type === 'deploy_up'">
              <CInput
                :model-value="getCheckDeployUrl()"
                type="url"
                :label="t('cursus.modules.delivrable.deployLabel')"
                :placeholder="t('cursus.modules.delivrable.deployPlaceholder')"
                @update:model-value="updateDeployUrl"
              />
            </template>

            <!-- Checks sans paramètres -->
            <template v-else>
              <p class="text-xs text-text-subtle">
                {{ t('cursus.modules.delivrable.noParams') }}
              </p>
            </template>
          </div>
        </div>
      </div>

      <p class="mt-1.5 text-xs text-text-subtle">
        {{ t('cursus.modules.delivrable.checksActive', { count: activeChecks.length }) }}
      </p>
    </div>

    <!-- Bouton prévisualisation YAML -->
    <div class="flex items-center justify-between">
      <UButton
        type="button"
        variant="outline"
        size="sm"
        icon="i-tabler-code"
        @click="showYamlModal = true"
      >
        {{ t('cursus.modules.delivrable.previewYamlButton') }}
      </UButton>
    </div>

    <!-- Modal YAML -->
    <UModal v-model:open="showYamlModal" :title="t('cursus.modules.delivrable.yamlModalTitle')">
      <template #body>
        <div class="space-y-3">
          <!-- Warnings dans le modal -->
          <div
            v-if="yamlWarnings.length > 0"
            class="space-y-2"
            role="region"
            :aria-label="t('cursus.modules.delivrable.yamlWarningsAriaLabel')"
          >
            <div
              v-for="warning in yamlWarnings"
              :key="warning.code"
              class="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2 text-sm text-warning-fg"
            >
              <UIcon name="i-tabler-alert-triangle" class="mt-0.5 size-4 shrink-0" />
              <span>{{ warning.message }}</span>
            </div>
          </div>

          <!-- Bloc YAML en lecture seule -->
          <div role="region" :aria-label="t('cursus.modules.delivrable.yamlContentAriaLabel')">
            <pre
              class="overflow-auto rounded-lg bg-muted px-4 py-3 text-xs text-text-default"
            ><code>{{ yamlContent }}</code></pre>
          </div>
        </div>
      </template>

      <template #footer>
        <UButton type="button" variant="ghost" @click="showYamlModal = false">
          {{ t('common.close') }}
        </UButton>
      </template>
    </UModal>
  </div>
</template>
