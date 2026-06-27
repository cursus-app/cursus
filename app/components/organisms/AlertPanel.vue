<script setup lang="ts">
/**
 * AlertPanel — panneau latéral de détail d'une alerte (drawer/slideover).
 *
 * Affiche :
 *  - Contexte complet
 *  - Lien vers dernier rapport harnais
 *  - Soumissions récentes du stagiaire
 *  - Actions : marquer traitée, ajouter commentaire (notification)
 *
 * ST-08.3 — TT-08.3.2
 */
import type { AlertKind, AlertSeverity } from '@prisma/client';

interface AlertUser {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
}

interface AlertDetail {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  context: Record<string, unknown> | null;
  createdAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
  sourceType: string | null;
  sourceId: string | null;
  user: AlertUser;
  resolvedBy: { id: string; fullName: string | null } | null;
}

interface Props {
  alert: AlertDetail | null;
  open: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  resolve: [id: string];
}>();

const { t, locale } = useI18n();
const toast = useToast();

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
});

const isResolvingAlert = ref(false);
const commentText = ref('');
const isSendingComment = ref(false);

const isResolved = computed(() => props.alert?.resolvedAt !== null);

const traineeName = computed(() => {
  if (!props.alert) {
    return '';
  }
  return props.alert.user.fullName ?? props.alert.user.email;
});

/** Badge couleur selon le kind. */
const kindBadgeColor = computed<'error' | 'warning' | 'info' | 'neutral'>(() => {
  if (!props.alert) {
    return 'neutral';
  }
  const map: Record<AlertKind, 'error' | 'warning' | 'info' | 'neutral'> = {
    SUBMISSION_LATE: 'error',
    QUIZ_REPEATEDLY_FAILED: 'warning',
    SUBMISSION_REPEATEDLY_FAILED: 'error',
    STAGIAIRE_BLOCKED: 'error',
    PROGRESS_STALLED: 'info',
    CAPSTONE_OVERDUE: 'warning',
  };
  return map[props.alert.kind] ?? 'neutral';
});

/** Icône selon le kind. */
const kindIcon = computed<string>(() => {
  if (!props.alert) {
    return 'i-tabler-alert-triangle';
  }
  const map: Record<AlertKind, string> = {
    SUBMISSION_LATE: 'i-tabler-clock-exclamation',
    QUIZ_REPEATEDLY_FAILED: 'i-tabler-help-circle',
    SUBMISSION_REPEATEDLY_FAILED: 'i-tabler-circle-x',
    STAGIAIRE_BLOCKED: 'i-tabler-lock',
    PROGRESS_STALLED: 'i-tabler-trending-down',
    CAPSTONE_OVERDUE: 'i-tabler-flag-exclamation',
  };
  return map[props.alert.kind] ?? 'i-tabler-alert-triangle';
});

/** Formater la date locale. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Clé de contexte à afficher (toutes les entrées significatives). */
const contextEntries = computed<{ key: string; value: string }[]>(() => {
  if (!props.alert?.context) {
    return [];
  }
  return Object.entries(props.alert.context)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ({ key: k, value: String(v) }));
});

/** Lien vers rapport harnais si sourceType = HarnessRun. */
const harnessRunLink = computed<string | null>(() => {
  if (!props.alert) {
    return null;
  }
  if (props.alert.sourceType === 'HarnessRun' && props.alert.sourceId) {
    return `/submissions/${props.alert.sourceId}`;
  }
  return null;
});

async function handleResolve() {
  if (!props.alert || isResolved.value) {
    return;
  }
  isResolvingAlert.value = true;
  try {
    emit('resolve', props.alert.id);
    isOpen.value = false;
  } finally {
    isResolvingAlert.value = false;
  }
}

async function sendComment() {
  if (!props.alert || !commentText.value.trim()) {
    return;
  }
  isSendingComment.value = true;
  try {
    await $fetch('/api/notifications', {
      // @ts-expect-error — pas d'endpoint POST /api/notifications typé (opération interne valide)
      method: 'POST',
      body: {
        userId: props.alert.user.id,
        type: 'ALERT_RAISED',
        title: t('alerts.comment.notifTitle'),
        body: commentText.value.trim(),
      },
    });
    commentText.value = '';
    toast.add({
      title: t('alerts.comment.sent'),
      color: 'success',
      icon: 'i-tabler-check',
    });
  } catch {
    toast.add({
      title: t('alerts.comment.error'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  } finally {
    isSendingComment.value = false;
  }
}

// Réinitialiser le commentaire quand on change d'alerte
watch(
  () => props.alert?.id,
  () => {
    commentText.value = '';
  },
);
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    :title="props.alert ? t(`alerts.kinds.${props.alert.kind}`) : ''"
    :description="traineeName"
    side="right"
    class="max-w-lg"
  >
    <template #header>
      <div class="flex items-center gap-3 p-4">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-tabler-x"
          :aria-label="t('common.close')"
          @click="isOpen = false"
        />
        <div v-if="props.alert" class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <UBadge :color="kindBadgeColor" variant="subtle" size="sm">
              <UIcon :name="kindIcon" class="mr-1 size-3" />
              {{ t(`alerts.kinds.${props.alert.kind}`) }}
            </UBadge>
            <UBadge
              :color="
                props.alert.severity === 'HIGH'
                  ? 'error'
                  : props.alert.severity === 'MEDIUM'
                    ? 'warning'
                    : 'neutral'
              "
              variant="outline"
              size="sm"
            >
              {{ t(`alerts.severity.${props.alert.severity}`) }}
            </UBadge>
          </div>
          <p class="mt-1 truncate text-sm text-text-muted">{{ traineeName }}</p>
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="props.alert" class="flex flex-col gap-6 px-4 py-4">
        <!-- ─── Infos générales ─────────────────────────────────────── -->
        <section aria-labelledby="alert-info-heading">
          <h3
            id="alert-info-heading"
            class="mb-3 text-xs font-semibold tracking-wide text-text-subtle uppercase"
          >
            {{ t('alerts.panel.info') }}
          </h3>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-text-muted">{{ t('alerts.panel.createdAt') }}</dt>
              <dd class="text-text-default">{{ formatDate(props.alert.createdAt) }}</dd>
            </div>
            <div v-if="isResolved" class="flex justify-between gap-2">
              <dt class="text-text-muted">{{ t('alerts.panel.resolvedAt') }}</dt>
              <dd class="text-success-fg">{{ formatDate(props.alert.resolvedAt!) }}</dd>
            </div>
            <div v-if="isResolved && props.alert.resolvedBy" class="flex justify-between gap-2">
              <dt class="text-text-muted">{{ t('alerts.panel.resolvedBy') }}</dt>
              <dd class="text-text-default">
                {{ props.alert.resolvedBy.fullName ?? t('alerts.resolvedBySystem') }}
              </dd>
            </div>
          </dl>
        </section>

        <!-- ─── Contexte ───────────────────────────────────────────── -->
        <section v-if="contextEntries.length > 0" aria-labelledby="alert-context-heading">
          <h3
            id="alert-context-heading"
            class="mb-3 text-xs font-semibold tracking-wide text-text-subtle uppercase"
          >
            {{ t('alerts.panel.context') }}
          </h3>
          <dl class="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-muted">
            <div
              v-for="entry in contextEntries"
              :key="entry.key"
              class="flex flex-col gap-0.5 px-3 py-2"
            >
              <dt class="text-xs text-text-muted">{{ entry.key }}</dt>
              <dd class="text-sm break-words text-text-default">{{ entry.value }}</dd>
            </div>
          </dl>
        </section>

        <!-- ─── Lien rapport harnais ───────────────────────────────── -->
        <section v-if="harnessRunLink" aria-labelledby="alert-harness-heading">
          <h3
            id="alert-harness-heading"
            class="mb-3 text-xs font-semibold tracking-wide text-text-subtle uppercase"
          >
            {{ t('alerts.panel.harnessReport') }}
          </h3>
          <NuxtLink
            :to="harnessRunLink"
            class="flex items-center gap-2 text-sm text-accent hover:underline"
          >
            <UIcon name="i-tabler-external-link" class="size-4" />
            {{ t('alerts.panel.viewReport') }}
          </NuxtLink>
        </section>

        <!-- ─── Commentaire formateur ─────────────────────────────── -->
        <section v-if="!isResolved" aria-labelledby="alert-comment-heading">
          <h3
            id="alert-comment-heading"
            class="mb-3 text-xs font-semibold tracking-wide text-text-subtle uppercase"
          >
            {{ t('alerts.actions.comment') }}
          </h3>
          <div class="space-y-2">
            <UTextarea
              v-model="commentText"
              :placeholder="t('alerts.comment.placeholder')"
              :rows="3"
              class="w-full"
              :aria-label="t('alerts.comment.placeholder')"
            />
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-tabler-send"
              :loading="isSendingComment"
              :disabled="isSendingComment || !commentText.trim()"
              @click="sendComment"
            >
              {{ t('alerts.comment.send') }}
            </UButton>
          </div>
        </section>
      </div>
    </template>

    <template v-if="props.alert && !isResolved" #footer>
      <div class="flex justify-end gap-3 border-t border-border-subtle p-4">
        <UButton color="neutral" variant="ghost" @click="isOpen = false">
          {{ t('common.close') }}
        </UButton>
        <UButton
          color="success"
          icon="i-tabler-check"
          :loading="isResolvingAlert"
          :disabled="isResolvingAlert"
          @click="handleResolve"
        >
          {{ t('alerts.actions.resolveConfirm') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
