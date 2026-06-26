<script setup lang="ts">
/**
 * Page /cohortes/:id — vue détaillée d'une cohorte.
 * Actions disponibles selon le statut + onglet membres + invitations + section Équipe co-formateurs.
 * Cf. ST-04.1 — TT-04.1.3, ST-04.2 — invitation stagiaires, ST-04.3 — TT-04.3.2
 */
import type { CohorteFull, CohorteMember } from '~/composables/useCohorte';
import type { InvitationItem } from '~/composables/useInvitation';

definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const { getCohorte, startCohorte, completeCohorte, archiveCohorte, deleteCohorte, loading } =
  useCohorte();
const { listInvitations, resendInvitation, loading: invLoading } = useInvitation();
const {
  addCoFormateur,
  removeCoFormateur,
  updateCoFormateurModules,
  loading: teamLoading,
} = useCoFormateurCohorte();
const { canManageCohorte } = usePermission();

const cohorteId = computed(() => {
  const rawId = route.params['id'];
  return Array.isArray(rawId) ? (rawId[0] ?? '') : (rawId ?? '');
});

useSeoMeta({ title: 'Cohorte — Cursus' });

// ─── Données ──────────────────────────────────────────────────────────────────

const cohorte = ref<CohorteFull | null>(null);
const invitations = ref<InvitationItem[]>([]);
const isLoadingPage = ref(true);
const showDeleteModal = ref(false);
const showInviteModal = ref(false);
const isDeleting = ref(false);
const actionError = ref<string | null>(null);

async function loadCohorte() {
  isLoadingPage.value = true;
  try {
    cohorte.value = await getCohorte(cohorteId.value);
    useSeoMeta({ title: `${cohorte.value.name} — Cursus` });
  } catch (err: unknown) {
    const fetchErr = err as { statusCode?: number; data?: { message?: string } };
    if (fetchErr.statusCode === 404) {
      await navigateTo('/cohortes');
    } else {
      toast.add({ title: t('errors.generic'), color: 'error', icon: 'i-tabler-circle-x' });
    }
  } finally {
    isLoadingPage.value = false;
  }
}

async function loadInvitations() {
  if (!canManage.value) {
    return;
  }
  try {
    invitations.value = await listInvitations(cohorteId.value);
  } catch {
    // Invitations are secondary — ne pas bloquer si l'appel échoue
  }
}

async function handleResend(invitationId: string) {
  try {
    await resendInvitation(invitationId);
    toast.add({
      title: t('invitations.resendSuccess'),
      color: 'success',
      icon: 'i-tabler-send',
    });
    // Recharger les invitations pour mettre à jour expiresAt
    void loadInvitations();
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: t((fetchErr.data?.message ?? 'errors.generic') as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  }
}

function isInvitationExpired(inv: InvitationItem): boolean {
  return new Date(inv.expiresAt) < new Date();
}

function isResendable(inv: InvitationItem): boolean {
  // Bouton "Renvoyer" visible si invitation non acceptée et expirée depuis > 3 jours
  // ou simplement si non acceptée (pour permettre le renvoi proactif)
  return !inv.acceptedAt && !inv.revokedAt;
}

onMounted(() => {
  void loadCohorte();
});

// ─── Helpers d'affichage ──────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  if (status === 'ACTIVE') {
    return 'bg-success-bg text-success-fg';
  }
  if (status === 'COMPLETED') {
    return 'bg-info-bg text-info-fg';
  }
  if (status === 'ARCHIVED') {
    return 'bg-muted text-text-subtle';
  }
  return 'bg-warning-bg text-warning-fg';
}

function roleLabel(role: string): string {
  if (role === 'FORMATEUR_PRINCIPAL') {
    return t('cohortes.roles.formateurPrincipal');
  }
  if (role === 'CO_FORMATEUR') {
    return t('cohortes.roles.coFormateur');
  }
  return t('cohortes.roles.stagiaire');
}

function roleBadgeClass(role: string): string {
  if (role === 'FORMATEUR_PRINCIPAL') {
    return 'bg-accent-subtle text-accent-text';
  }
  if (role === 'CO_FORMATEUR') {
    return 'bg-info-bg text-info-fg';
  }
  return 'bg-muted text-text-muted';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Actions ──────────────────────────────────────────────────────────────────

const canManage = computed(() => canManageCohorte(cohorteId.value));

// Charger les invitations dès que les droits sont connus
watch(canManage, (val) => {
  if (val && cohorteId.value) {
    void loadInvitations();
  }
});

async function handleStart() {
  actionError.value = null;
  try {
    cohorte.value = await startCohorte(cohorteId.value);
    toast.add({ title: t('cohortes.startSuccess'), color: 'success', icon: 'i-tabler-check' });
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    const msgKey = fetchErr.data?.message ?? 'errors.generic';
    actionError.value = t(msgKey as Parameters<typeof t>[0]);
    toast.add({ title: actionError.value ?? '', color: 'error', icon: 'i-tabler-circle-x' });
  }
}

async function handleComplete() {
  try {
    cohorte.value = await completeCohorte(cohorteId.value);
    toast.add({ title: t('cohortes.completeSuccess'), color: 'success', icon: 'i-tabler-check' });
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: t((fetchErr.data?.message ?? 'errors.generic') as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  }
}

async function handleArchive() {
  try {
    cohorte.value = await archiveCohorte(cohorteId.value);
    toast.add({ title: t('cohortes.archiveSuccess'), color: 'success', icon: 'i-tabler-check' });
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: t((fetchErr.data?.message ?? 'errors.generic') as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  }
}

async function handleDelete() {
  isDeleting.value = true;
  try {
    await deleteCohorte(cohorteId.value);
    toast.add({ title: t('cohortes.deleteSuccess'), color: 'success', icon: 'i-tabler-check' });
    await navigateTo('/cohortes');
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    const msgKey = fetchErr.data?.message ?? 'errors.generic';
    toast.add({
      title: t(msgKey as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
    showDeleteModal.value = false;
  } finally {
    isDeleting.value = false;
  }
}

// ─── Section Équipe — co-formateurs ──────────────────────────────────────────

const coFormateurs = computed<CohorteMember[]>(() =>
  (cohorte.value?.memberships ?? []).filter((m) => m.role === 'CO_FORMATEUR'),
);

// Ajouter un co-formateur
const showAddModal = ref(false);
const addEmail = ref('');
const addEmailError = ref<string | null>(null);

async function handleAddCoFormateur() {
  addEmailError.value = null;
  const email = addEmail.value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addEmailError.value = t('cohortes.team.emailInvalid');
    return;
  }
  try {
    const membership = await addCoFormateur(cohorteId.value, { email, moduleIds: null });
    // Recharger la cohorte pour avoir la liste à jour
    cohorte.value = await getCohorte(cohorteId.value);
    toast.add({
      title: t('cohortes.team.addSuccess', {
        name: membership.user.fullName ?? membership.user.githubHandle ?? email,
      }),
      color: 'success',
      icon: 'i-tabler-user-check',
    });
    showAddModal.value = false;
    addEmail.value = '';
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    const msgKey = fetchErr.data?.message ?? 'errors.generic';
    addEmailError.value = t(msgKey as Parameters<typeof t>[0]);
  }
}

// Retirer un co-formateur
const removingUserId = ref<string | null>(null);

async function handleRemoveCoFormateur(userId: string, displayName: string) {
  removingUserId.value = userId;
  try {
    await removeCoFormateur(cohorteId.value, userId);
    cohorte.value = await getCohorte(cohorteId.value);
    toast.add({
      title: t('cohortes.team.removeSuccess', { name: displayName }),
      color: 'success',
      icon: 'i-tabler-user-minus',
    });
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: t((fetchErr.data?.message ?? 'errors.generic') as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  } finally {
    removingUserId.value = null;
  }
}

// Modifier les modules assignés à un co-formateur
const editingMember = ref<CohorteMember | null>(null);
const editModuleIds = ref<string[]>([]);
const showEditModulesModal = ref(false);

interface ModuleOption {
  id: string;
  title: string;
  week: number;
}
const availableModules = ref<ModuleOption[]>([]);
const isLoadingModules = ref(false);

async function openEditModulesModal(member: CohorteMember) {
  editingMember.value = member;
  editModuleIds.value = member.moduleIds ? [...member.moduleIds] : [];
  showEditModulesModal.value = true;

  // Charger les modules du cursus si pas déjà fait
  if (availableModules.value.length === 0 && cohorte.value) {
    isLoadingModules.value = true;
    try {
      const cursusId = cohorte.value.cursusVersion.cursus.id;
      const modules = await $fetch<ModuleOption[]>(`/api/cursus/${cursusId}/modules`);
      availableModules.value = modules;
    } catch {
      // Non bloquant : l'utilisateur peut entrer les IDs manuellement
    } finally {
      isLoadingModules.value = false;
    }
  }
}

function toggleModule(moduleId: string) {
  const idx = editModuleIds.value.indexOf(moduleId);
  if (idx === -1) {
    editModuleIds.value = [...editModuleIds.value, moduleId];
  } else {
    editModuleIds.value = editModuleIds.value.filter((id) => id !== moduleId);
  }
}

function setGlobalAccess() {
  editModuleIds.value = [];
}

async function handleSaveModules() {
  if (!editingMember.value) {
    return;
  }
  const userId = editingMember.value.user.id;
  const moduleIds = editModuleIds.value.length > 0 ? editModuleIds.value : null;
  try {
    await updateCoFormateurModules(cohorteId.value, userId, { moduleIds });
    cohorte.value = await getCohorte(cohorteId.value);
    toast.add({
      title: t('cohortes.team.modulesUpdated'),
      color: 'success',
      icon: 'i-tabler-check',
    });
    showEditModulesModal.value = false;
    editingMember.value = null;
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } };
    toast.add({
      title: t((fetchErr.data?.message ?? 'errors.generic') as Parameters<typeof t>[0]),
      color: 'error',
      icon: 'i-tabler-circle-x',
    });
  }
}

function coFormateurScopeLabel(member: CohorteMember): string {
  if (!member.moduleIds || member.moduleIds.length === 0) {
    return t('cohortes.team.globalAccess');
  }
  return t('cohortes.team.modulesCount', { count: member.moduleIds.length });
}

function memberDisplayName(member: CohorteMember): string {
  return member.user.fullName ?? member.user.githubHandle ?? t('cohortes.unknownMember');
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-10">
    <!-- Fil d'Ariane -->
    <UBreadcrumb
      :items="[{ label: t('cohortes.title'), to: '/cohortes' }, { label: cohorte?.name ?? '…' }]"
      class="mb-6"
    />

    <!-- Skeleton chargement -->
    <div v-if="isLoadingPage" class="space-y-4">
      <div class="skeleton h-10 w-48 rounded" />
      <div class="skeleton h-32 rounded-lg" />
      <div class="skeleton h-64 rounded-lg" />
    </div>

    <template v-else-if="cohorte">
      <!-- En-tête -->
      <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
              {{ cohorte.name }}
            </h1>
            <span
              class="rounded-full px-2.5 py-0.5 text-sm font-medium"
              :class="statusBadgeClass(cohorte.status)"
            >
              {{ t(`cohortes.status.${cohorte.status}`) }}
            </span>
          </div>
          <p class="mt-1 text-sm text-text-muted">
            {{ cohorte.cursusVersion.cursus.title }}
          </p>
        </div>

        <!-- Actions selon le statut -->
        <div v-if="canManage" class="flex flex-wrap gap-2">
          <!-- Bouton Inviter (disponible sur toutes les cohortes non archivées) -->
          <UButton
            v-if="cohorte.status !== 'ARCHIVED'"
            icon="i-tabler-user-plus"
            color="neutral"
            variant="outline"
            @click="showInviteModal = true"
          >
            {{ t('invitations.inviteButton') }}
          </UButton>

          <!-- DRAFT -->
          <template v-if="cohorte.status === 'DRAFT'">
            <UButton
              :to="`/cohortes/${cohorte.id}/edit`"
              icon="i-tabler-pencil"
              color="neutral"
              variant="outline"
            >
              {{ t('cohortes.edit') }}
            </UButton>
            <UButton
              icon="i-tabler-player-play"
              color="primary"
              :loading="loading"
              @click="handleStart"
            >
              {{ t('cohortes.start') }}
            </UButton>
            <UButton
              icon="i-tabler-trash"
              color="error"
              variant="ghost"
              @click="showDeleteModal = true"
            >
              {{ t('cohortes.delete') }}
            </UButton>
          </template>

          <!-- ACTIVE -->
          <template v-else-if="cohorte.status === 'ACTIVE'">
            <UButton
              icon="i-tabler-flag-check"
              color="neutral"
              :loading="loading"
              @click="handleComplete"
            >
              {{ t('cohortes.complete') }}
            </UButton>
          </template>

          <!-- COMPLETED -->
          <template v-else-if="cohorte.status === 'COMPLETED'">
            <UButton
              icon="i-tabler-archive"
              color="neutral"
              :loading="loading"
              @click="handleArchive"
            >
              {{ t('cohortes.archive') }}
            </UButton>
          </template>
        </div>
      </div>

      <!-- Message d'erreur action -->
      <div
        v-if="actionError"
        class="mb-4 flex items-center gap-2 rounded-lg border border-border-subtle bg-danger-bg p-3 text-sm text-danger-fg"
      >
        <UIcon name="i-tabler-alert-triangle" class="size-4 shrink-0" />
        {{ actionError }}
      </div>

      <!-- Informations générales -->
      <UCard class="mb-6 border border-border-subtle bg-surface">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cohortes.startDate') }}
            </p>
            <p class="mt-1 text-sm text-text-default">{{ formatDate(cohorte.startDate) }}</p>
          </div>
          <div>
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cohortes.endDate') }}
            </p>
            <p class="mt-1 text-sm text-text-default">{{ formatDate(cohorte.endDate) }}</p>
          </div>
          <div>
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cohortes.rhythm') }}
            </p>
            <p class="mt-1 text-sm text-text-default">
              {{ t(`cohortes.rhythmLabel.${cohorte.rhythm}`) }}
            </p>
          </div>
          <div>
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cohortes.cursus') }}
            </p>
            <p class="mt-1 text-sm text-text-default">
              {{ cohorte.cursusVersion.cursus.title }}
              <span class="text-text-subtle">(v{{ cohorte.cursusVersion.version }})</span>
            </p>
          </div>
          <div>
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cohortes.members') }}
            </p>
            <p class="mt-1 text-sm text-text-default">{{ cohorte._count.memberships }}</p>
          </div>
          <div v-if="cohorte.archivedAt">
            <p class="text-xs font-medium tracking-wide text-text-subtle uppercase">
              {{ t('cohortes.archivedAt') }}
            </p>
            <p class="mt-1 text-sm text-text-default">{{ formatDate(cohorte.archivedAt) }}</p>
          </div>
        </div>
      </UCard>

      <!-- Section Équipe (co-formateurs) -->
      <UCard class="mb-6 border border-border-subtle bg-surface">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-base font-semibold text-text-strong">
              {{ t('cohortes.team.title') }}
              <span class="ml-1 text-sm font-normal text-text-muted">
                ({{ coFormateurs.length }})
              </span>
            </h2>
            <UButton
              v-if="canManage"
              icon="i-tabler-user-plus"
              color="primary"
              variant="outline"
              size="sm"
              @click="showAddModal = true"
            >
              {{ t('cohortes.team.add') }}
            </UButton>
          </div>
        </template>

        <div v-if="coFormateurs.length === 0" class="py-8 text-center text-text-muted">
          {{ t('cohortes.team.empty') }}
        </div>

        <ul v-else class="divide-y divide-border-subtle">
          <li v-for="member in coFormateurs" :key="member.id" class="flex items-center gap-3 py-3">
            <!-- Avatar -->
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"
              aria-hidden="true"
            >
              <img
                v-if="member.user.avatarUrl"
                :src="member.user.avatarUrl"
                :alt="memberDisplayName(member)"
                class="size-9 rounded-full object-cover"
              />
              <UIcon v-else name="i-tabler-user" class="size-5 text-text-subtle" />
            </div>

            <!-- Nom + scope -->
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-text-strong">
                {{ memberDisplayName(member) }}
              </p>
              <p class="flex items-center gap-1 text-xs text-text-muted">
                <UIcon
                  :name="
                    member.moduleIds && member.moduleIds.length > 0
                      ? 'i-tabler-layout-grid'
                      : 'i-tabler-globe'
                  "
                  class="size-3.5 shrink-0"
                />
                {{ coFormateurScopeLabel(member) }}
              </p>
            </div>

            <!-- Actions -->
            <div v-if="canManage" class="flex shrink-0 items-center gap-2">
              <UButton
                icon="i-tabler-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="t('cohortes.team.editModules')"
                @click="openEditModulesModal(member)"
              />
              <UButton
                icon="i-tabler-user-minus"
                color="error"
                variant="ghost"
                size="xs"
                :loading="removingUserId === member.user.id && teamLoading"
                :aria-label="t('cohortes.team.remove')"
                @click="handleRemoveCoFormateur(member.user.id, memberDisplayName(member))"
              />
            </div>
          </li>
        </ul>
      </UCard>

      <!-- Membres -->
      <UCard class="border border-border-subtle bg-surface">
        <template #header>
          <h2 class="text-base font-semibold text-text-strong">
            {{ t('cohortes.members') }}
            <span class="ml-1 text-sm font-normal text-text-muted">
              ({{ cohorte.memberships.length }})
            </span>
          </h2>
        </template>

        <div v-if="cohorte.memberships.length === 0" class="py-8 text-center text-text-muted">
          {{ t('cohortes.noMembers') }}
        </div>

        <ul v-else class="divide-y divide-border-subtle">
          <li
            v-for="member in cohorte.memberships"
            :key="member.id"
            class="flex items-center gap-3 py-3"
          >
            <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <img
                v-if="member.user.avatarUrl"
                :src="member.user.avatarUrl"
                :alt="member.user.fullName ?? ''"
                class="size-9 rounded-full object-cover"
              />
              <UIcon v-else name="i-tabler-user" class="size-5 text-text-subtle" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-text-strong">
                {{
                  member.user.fullName ?? member.user.githubHandle ?? t('cohortes.unknownMember')
                }}
              </p>
              <p class="text-xs text-text-muted">{{ formatDate(member.joinedAt) }}</p>
            </div>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
              :class="roleBadgeClass(member.role)"
            >
              {{ roleLabel(member.role) }}
            </span>
          </li>
        </ul>
      </UCard>
    </template>

    <!-- Section invitations en attente -->
    <template v-if="canManage && invitations.length > 0">
      <UCard class="mt-6 border border-border-subtle bg-surface">
        <template #header>
          <h2 class="text-base font-semibold text-text-strong">
            {{ t('invitations.pending') }}
            <span class="ml-1 text-sm font-normal text-text-muted">
              ({{ invitations.length }})
            </span>
          </h2>
        </template>

        <ul class="divide-y divide-border-subtle">
          <li v-for="inv in invitations" :key="inv.id" class="flex items-center gap-3 py-3">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <UIcon name="i-tabler-mail" class="size-5 text-text-subtle" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-text-default">{{ inv.email }}</p>
              <p class="text-xs text-text-muted">
                {{ t('invitations.invitedAt') }} {{ formatDate(inv.createdAt) }}
                <span v-if="isInvitationExpired(inv)" class="ml-2 text-warning-fg">
                  ({{ t('invitations.expired') }})
                </span>
              </p>
            </div>
            <UButton
              v-if="isResendable(inv)"
              size="xs"
              color="neutral"
              variant="outline"
              icon="i-tabler-send"
              :loading="invLoading"
              @click="handleResend(inv.id)"
            >
              {{ t('invitations.resend') }}
            </UButton>
          </li>
        </ul>
      </UCard>
    </template>

    <!-- InviteModal -->
    <InviteModal
      v-if="canManage && cohorte"
      :cohorte-id="cohorteId"
      :open="showInviteModal"
      @update:open="showInviteModal = $event"
      @invited="loadInvitations"
    />

    <!-- Modal suppression cohorte -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="mb-2 text-lg font-semibold text-text-strong">
            {{ t('cohortes.confirmDelete.title') }}
          </h3>
          <p class="mb-6 text-sm text-text-muted">
            {{ t('cohortes.confirmDelete.description') }}
          </p>
          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="isDeleting"
              @click="showDeleteModal = false"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="isDeleting" @click="handleDelete">
              {{ t('cohortes.confirmDelete.confirm') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal ajout co-formateur -->
    <UModal v-model:open="showAddModal">
      <template #content>
        <div class="p-6">
          <h3 class="mb-1 text-lg font-semibold text-text-strong">
            {{ t('cohortes.team.addTitle') }}
          </h3>
          <p class="mb-4 text-sm text-text-muted">
            {{ t('cohortes.team.addDescription') }}
          </p>

          <div class="mb-4">
            <label for="coformateur-email" class="mb-1 block text-sm font-medium text-text-strong">
              {{ t('cohortes.team.emailLabel') }}
            </label>
            <UInput
              id="coformateur-email"
              v-model="addEmail"
              type="email"
              :placeholder="t('cohortes.team.emailPlaceholder')"
              autocomplete="email"
              :status="addEmailError ? 'error' : undefined"
              @keydown.enter="handleAddCoFormateur"
            />
            <p v-if="addEmailError" class="mt-1 text-xs text-danger-fg" role="alert">
              {{ addEmailError }}
            </p>
          </div>

          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="teamLoading"
              @click="showAddModal = false"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              icon="i-tabler-user-plus"
              color="primary"
              :loading="teamLoading"
              @click="handleAddCoFormateur"
            >
              {{ t('cohortes.team.add') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Modal édition modules co-formateur -->
    <UModal v-model:open="showEditModulesModal">
      <template #content>
        <div class="p-6">
          <h3 class="mb-1 text-lg font-semibold text-text-strong">
            {{ t('cohortes.team.editModulesTitle') }}
          </h3>
          <p v-if="editingMember" class="mb-4 text-sm text-text-muted">
            {{ t('cohortes.team.editModulesFor', { name: memberDisplayName(editingMember) }) }}
          </p>

          <!-- Accès global -->
          <div class="mb-4 flex items-center gap-2">
            <input
              id="scope-global"
              type="radio"
              :checked="editModuleIds.length === 0"
              class="accent-accent"
              @change="setGlobalAccess"
            />
            <label for="scope-global" class="cursor-pointer text-sm text-text-default">
              {{ t('cohortes.team.globalAccessLabel') }}
            </label>
          </div>

          <!-- Sélection par modules -->
          <div class="mb-4">
            <p class="mb-2 text-sm font-medium text-text-default">
              {{ t('cohortes.team.limitedAccessLabel') }}
            </p>
            <div v-if="isLoadingModules" class="py-4 text-center text-sm text-text-muted">
              {{ t('common.loading') }}
            </div>
            <ul v-else-if="availableModules.length > 0" class="max-h-56 space-y-1 overflow-y-auto">
              <li
                v-for="mod in availableModules"
                :key="mod.id"
                class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
              >
                <input
                  :id="`module-${mod.id}`"
                  type="checkbox"
                  :value="mod.id"
                  :checked="editModuleIds.includes(mod.id)"
                  class="accent-accent"
                  @change="toggleModule(mod.id)"
                />
                <label
                  :for="`module-${mod.id}`"
                  class="flex-1 cursor-pointer text-sm text-text-default"
                >
                  <span class="text-text-muted">S{{ mod.week }}</span>
                  {{ mod.title }}
                </label>
              </li>
            </ul>
            <p v-else class="text-sm text-text-muted">
              {{ t('cohortes.team.noModulesAvailable') }}
            </p>
          </div>

          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="teamLoading"
              @click="showEditModulesModal = false"
            >
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              icon="i-tabler-check"
              color="primary"
              :loading="teamLoading"
              @click="handleSaveModules"
            >
              {{ t('common.save') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
