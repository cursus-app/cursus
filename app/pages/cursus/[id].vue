<script setup lang="ts">
/**
 * Page /cursus/:id — détail d'un cursus.
 * Cf. ST-03.1 — TT-03.1.7.
 */
import type { CursusFull } from '~/composables/useCursus';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const { getCursus, publishCursus, archiveCursus, deleteCursus, cloneCursus, loading } = useCursus();
const { canManageCursus } = usePermission();
const userStore = useUserStore();

const cursusId = computed(() => {
  const rawId = route.params['id'];
  return Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
});

function tDynamic(key: string): string {
  return t(key as Parameters<typeof t>[0]);
}

useSeoMeta({ title: 'Cursus — Cursus' });

// ─── Données ──────────────────────────────────────────────────────────────────

const cursus = ref<CursusFull | null>(null);
const isLoadingPage = ref(true);
const showDeleteModal = ref(false);
const isDeleting = ref(false);
const isDuplicating = ref(false);

async function loadCursus() {
  isLoadingPage.value = true;
  try {
    cursus.value = await getCursus(cursusId.value);
    useSeoMeta({ title: `${cursus.value.title} — Cursus` });
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }; statusCode?: number };
    if (fetchErr.statusCode === 404 || fetchErr.data?.message === 'cursus.errors.notFound') {
      await navigateTo('/cursus');
    } else {
      toast.add({
        title: t('errors.generic'),
        color: 'error',
        icon: 'i-tabler-circle-x',
      });
    }
  } finally {
    isLoadingPage.value = false;
  }
}

onMounted(() => {
  void loadCursus();
});

// ─── Permissions ─────────────────────────────────────────────────────────────

const isOwnerOrAdmin = computed(() => {
  if (!cursus.value) {
    return false;
  }
  return userStore.userId === cursus.value.ownerId || userStore.globalRole === 'ADMIN';
});

const canEdit = computed(
  () => isOwnerOrAdmin.value && canManageCursus() && cursus.value?.status !== 'ARCHIVED',
);
const canPublish = computed(
  () => isOwnerOrAdmin.value && canManageCursus() && cursus.value?.status === 'DRAFT',
);
const canArchive = computed(
  () => isOwnerOrAdmin.value && canManageCursus() && cursus.value?.status === 'PUBLISHED',
);
const canDelete = computed(
  () => isOwnerOrAdmin.value && canManageCursus() && cursus.value?.status === 'DRAFT',
);
const canDuplicate = computed(() => isOwnerOrAdmin.value && canManageCursus());

// ─── Actions ──────────────────────────────────────────────────────────────────

async function handlePublish() {
  if (!cursus.value) {
    return;
  }
  try {
    const updated = await publishCursus(cursus.value.id);
    cursus.value = { ...cursus.value, ...updated };
    toast.add({
      title: t('cursus.publishSuccess'),
      color: 'success',
      icon: 'i-tabler-check',
    });
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

async function handleArchive() {
  if (!cursus.value) {
    return;
  }
  try {
    const updated = await archiveCursus(cursus.value.id);
    cursus.value = { ...cursus.value, ...updated };
    toast.add({
      title: t('cursus.archiveSuccess'),
      color: 'success',
      icon: 'i-tabler-check',
    });
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

async function handleDelete() {
  if (!cursus.value) {
    return;
  }
  isDeleting.value = true;
  try {
    await deleteCursus(cursus.value.id);
    showDeleteModal.value = false;
    toast.add({
      title: t('cursus.deleteSuccess'),
      color: 'success',
      icon: 'i-tabler-check',
    });

    await navigateTo('/cursus');
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string; data?: { count?: number } } };
    const msgKey = fetchErr.data?.message ?? 'errors.generic';
    const count = fetchErr.data?.data?.count ?? 0;
    toast.add({
      title: t(msgKey as Parameters<typeof t>[0], { count }),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  } finally {
    isDeleting.value = false;
  }
}

async function handleDuplicate() {
  if (!cursus.value) {
    return;
  }
  isDuplicating.value = true;
  try {
    const clone = await cloneCursus(cursus.value.id);
    toast.add({
      title: t('cursus.duplicateSuccess', { title: clone.title }),
      color: 'success',
      icon: 'i-tabler-copy-check',
    });
    await navigateTo(`/cursus/${clone.id}`);
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    const msgKey = fetchErr.data?.message ?? 'errors.generic';
    toast.add({
      title: t(msgKey as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  } finally {
    isDuplicating.value = false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  if (status === 'PUBLISHED') {
    return 'bg-success-bg text-success-fg';
  }
  if (status === 'ARCHIVED') {
    return 'bg-danger-bg text-danger-fg';
  }
  return 'bg-muted text-text-muted';
}

function statusLabel(status: string): string {
  if (status === 'PUBLISHED') {
    return t('cursus.published');
  }
  if (status === 'ARCHIVED') {
    return t('cursus.archived');
  }
  return t('cursus.draft');
}

function levelLabel(level: string): string {
  if (level === 'BEGINNER') {
    return t('cursus.level.BEGINNER');
  }
  if (level === 'INTERMEDIATE') {
    return t('cursus.level.INTERMEDIATE');
  }
  return t('cursus.level.ADVANCED');
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10">
    <!-- Fil d'Ariane -->
    <!-- eslint-disable-next-line link-checker/valid-route -->
    <UBreadcrumb
      :items="[{ label: t('cursus.title'), to: '/cursus' }, { label: cursus?.title ?? '…' }]"
      class="mb-6"
    />

    <!-- Skeleton chargement -->
    <div v-if="isLoadingPage" class="space-y-6">
      <div class="skeleton h-10 w-3/4 rounded-lg" />
      <div class="skeleton h-48 rounded-lg" />
      <div class="skeleton h-32 rounded-lg" />
    </div>

    <template v-else-if="cursus">
      <!-- En-tête cursus -->
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
              {{ cursus.title }}
            </h1>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="statusBadgeClass(cursus.status)"
            >
              {{ statusLabel(cursus.status) }}
            </span>
          </div>
          <p class="mt-1 font-mono text-xs text-text-subtle">/cursus/{{ cursus.slug }}</p>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="canEdit"
            :to="`/cursus/${cursus.id}/edit`"
            icon="i-tabler-pencil"
            color="neutral"
            variant="outline"
            size="sm"
          >
            {{ t('cursus.actions.edit') }}
          </UButton>
          <UButton
            v-if="canPublish"
            icon="i-tabler-world-upload"
            color="primary"
            size="sm"
            :loading="loading"
            :disabled="loading"
            @click="handlePublish"
          >
            {{ t('cursus.actions.publish') }}
          </UButton>
          <UButton
            v-if="canArchive"
            icon="i-tabler-archive"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="loading"
            :disabled="loading"
            @click="handleArchive"
          >
            {{ t('cursus.actions.archive') }}
          </UButton>
          <UButton
            v-if="canDelete"
            icon="i-tabler-trash"
            color="error"
            variant="soft"
            size="sm"
            :disabled="loading"
            @click="showDeleteModal = true"
          >
            {{ t('cursus.actions.delete') }}
          </UButton>
          <UButton
            v-if="canDuplicate"
            icon="i-tabler-copy"
            color="neutral"
            variant="outline"
            size="sm"
            :loading="isDuplicating"
            :disabled="isDuplicating || loading"
            @click="handleDuplicate"
          >
            {{ t('cursus.actions.duplicate') }}
          </UButton>
        </div>
      </div>

      <!-- Métadonnées -->
      <UCard class="mb-6 border border-border-subtle bg-surface">
        <div class="grid gap-4 sm:grid-cols-3">
          <div>
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cursus.fields.domain') }}
            </p>
            <p class="mt-1 text-sm text-text-default">
              {{ tDynamic(`cursus.domain.${cursus.domain}`) }}
            </p>
          </div>
          <div>
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cursus.fields.level') }}
            </p>
            <p class="mt-1 text-sm text-text-default">{{ levelLabel(cursus.level) }}</p>
          </div>
          <div>
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cursus.fields.durationWeeks') }}
            </p>
            <p class="mt-1 text-sm text-text-default">{{ cursus.durationWeeks }} sem.</p>
          </div>
        </div>

        <div v-if="cursus.description" class="mt-4 border-t border-border-subtle pt-4">
          <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
            {{ t('cursus.fields.description') }}
          </p>
          <p class="mt-1 text-sm whitespace-pre-wrap text-text-default">
            {{ cursus.description }}
          </p>
        </div>

        <div v-if="cursus.prerequisites" class="mt-4 border-t border-border-subtle pt-4">
          <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
            {{ t('cursus.fields.prerequisites') }}
          </p>
          <p class="mt-1 text-sm whitespace-pre-wrap text-text-default">
            {{ cursus.prerequisites }}
          </p>
        </div>
      </UCard>

      <!-- Résumé modules -->
      <UCard class="mb-6 border border-border-subtle bg-surface">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-text-strong">
              {{ t('cursus.modules.count', { n: cursus._count.modules }) }}
            </p>
            <p class="mt-0.5 text-xs text-text-muted">{{ t('cursus.filter.all') }} — ST-03.2</p>
          </div>
          <UIcon name="i-tabler-stack" class="size-8 text-text-subtle" />
        </div>
      </UCard>

      <!-- Versions publiées -->
      <UCard v-if="cursus.versions.length > 0" class="border border-border-subtle bg-surface">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-medium text-text-strong">
              {{ t('cursus.versionsPublished') }}
            </h2>
            <UButton
              v-if="isOwnerOrAdmin"
              :to="`/cursus/${cursus.id}/versions`"
              icon="i-tabler-history"
              color="neutral"
              variant="ghost"
              size="xs"
            >
              {{ t('cursus.versions.title') }}
            </UButton>
          </div>
        </template>
        <ul class="space-y-2">
          <li
            v-for="v in cursus.versions"
            :key="v.id"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-text-default">v{{ v.version }}</span>
            <span class="text-text-muted">
              {{ new Date(v.publishedAt).toLocaleDateString() }}
            </span>
          </li>
        </ul>
      </UCard>
    </template>

    <!-- Modale confirmation suppression -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <div class="mb-4 flex items-start gap-3">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-bg"
            >
              <UIcon name="i-tabler-alert-triangle" class="size-5 text-danger-fg" />
            </div>
            <div>
              <h3 class="font-semibold text-text-strong">
                {{ t('cursus.confirmDelete.title') }}
              </h3>
              <p class="mt-1 text-sm text-text-muted">
                {{ t('cursus.confirmDelete.description') }}
              </p>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <UButton
              color="error"
              icon="i-tabler-trash"
              :loading="isDeleting"
              :disabled="isDeleting"
              @click="handleDelete"
            >
              {{ t('cursus.confirmDelete.confirm') }}
            </UButton>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              :disabled="isDeleting"
              @click="showDeleteModal = false"
            >
              {{ t('cursus.confirmDelete.cancel') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
