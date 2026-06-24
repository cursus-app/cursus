<script setup lang="ts">
/**
 * Page /profil — gestion du profil utilisateur.
 * Cf. ST-02.6 — TT-02.6.1, TT-02.6.2, TT-02.6.3, TT-02.6.4.
 *
 * Fonctionnalités :
 *  - Affichage avatar + nom + email + badge rôle
 *  - Upload avatar avec preview (multipart)
 *  - Édition inline avec autosave (debounce 500ms)
 *  - Toggle profil public + publicSlug
 *  - Préférences locale + timezone
 *  - Lien vers /settings/2fa
 *  - Danger zone : suppression de compte avec double confirmation
 */
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { updateProfileSchema, deleteAccountSchema } from '~~/shared/schemas/profile'

// useDebounceFn est auto-importé par @vueuse/nuxt — pas d'import explicite nécessaire.

definePageMeta({
  middleware: 'auth',
  layout: 'default',
})

useSeoMeta({ title: 'Mon profil — Cursus', robots: 'noindex' })

const { t } = useI18n()
const toast = useToast()
const supabase = useSupabaseClient()
const supabaseUser = useSupabaseUser()

// ─── Données profil ───────────────────────────────────────────────────────────

interface ProfileData {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  bio: string | null
  locale: string
  timezone: string
  isPublic: boolean
  publicSlug: string | null
  twoFaEnabled: boolean
  globalRole: string | null
}

const profile = ref<ProfileData | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)

async function loadProfile() {
  isLoading.value = true
  try {
    const data = await $fetch<ProfileData>('/api/me/profile')
    profile.value = data
    // Pré-remplir le formulaire
    profileForm.setValues({
      fullName: data.fullName ?? undefined,
      bio: data.bio ?? undefined,
      locale: (data.locale as 'fr' | 'en') ?? 'fr',
      timezone: data.timezone,
      isPublic: data.isPublic,
      publicSlug: data.publicSlug ?? undefined,
    })
  } catch {
    toast.add({
      title: t('errors.generic'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => { void loadProfile() })

// ─── Formulaire profil (édition inline avec autosave) ─────────────────────────

const profileForm = useForm({
  validationSchema: toTypedSchema(updateProfileSchema),
})

// useDebounceFn auto-importé depuis @vueuse/nuxt
const saveProfile = useDebounceFn(async (values: Record<string, unknown>) => {
  if (isSaving.value) { return }
  isSaving.value = true
  try {
    const updated = await $fetch<ProfileData>('/api/profile', {
      method: 'PATCH',
      body: values,
    })
    if (profile.value) {
      profile.value = { ...profile.value, ...updated }
    }
    toast.add({
      title: t('profile.savedToast'),
      color: 'success',
      icon: 'i-tabler-check',
    })
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } }
    const msgKey = fetchErr.data?.message ?? 'profile.errors.saveFailed'
    toast.add({
      title: t(msgKey),
      color: 'error',
      icon: 'i-tabler-circle-x',
    })
  } finally {
    isSaving.value = false
  }
}, 500)

// Watcher sur les champs pour déclencher l'autosave
const { values: formValues } = profileForm
watch(formValues, async (newValues) => {
  const { errors } = await profileForm.validate()
  const hasErrors = Object.keys(errors).length > 0
  if (!hasErrors && profile.value) {
    void saveProfile(newValues)
  }
}, { deep: true })

// ─── Upload avatar ─────────────────────────────────────────────────────────────

const avatarInput = ref<HTMLInputElement | null>(null)
const avatarPreview = ref<string | null>(null)
const isUploadingAvatar = ref(false)

function triggerAvatarInput() {
  avatarInput.value?.click()
}

async function onAvatarChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) { return }

  // Validation côté client avant envoi
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
  if (!ALLOWED.includes(file.type)) {
    toast.add({
      title: t('profile.avatar.errors.invalidType'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    })
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.add({
      title: t('profile.avatar.errors.tooLarge'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    })
    return
  }

  // Preview locale immédiate
  avatarPreview.value = URL.createObjectURL(file)

  isUploadingAvatar.value = true
  try {
    const formData = new FormData()
    formData.append('avatar', file)

    const result = await $fetch<{ avatarUrl: string }>('/api/profile/avatar', {
      method: 'POST',
      body: formData,
    })

    if (profile.value) {
      profile.value.avatarUrl = result.avatarUrl
    }
    // Libérer l'object URL après récupération de l'URL permanente
    if (avatarPreview.value) {
      URL.revokeObjectURL(avatarPreview.value)
      avatarPreview.value = null
    }

    toast.add({
      title: t('profile.savedToast'),
      color: 'success',
      icon: 'i-tabler-check',
    })
  } catch {
    toast.add({
      title: t('profile.avatar.errors.uploadFailed'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    })
    // Annuler la preview si l'upload échoue
    if (avatarPreview.value) {
      URL.revokeObjectURL(avatarPreview.value)
      avatarPreview.value = null
    }
  } finally {
    isUploadingAvatar.value = false
    // Réinitialiser l'input pour permettre de re-sélectionner le même fichier
    if (target) { target.value = '' }
  }
}

// URL d'avatar effective : preview locale en priorité, sinon URL serveur
const currentAvatarUrl = computed(() => avatarPreview.value ?? profile.value?.avatarUrl ?? null)

// ─── Danger zone — suppression de compte ─────────────────────────────────────

const showDeleteModal = ref(false)
const isDeletingAccount = ref(false)

const deleteForm = useForm({
  validationSchema: toTypedSchema(deleteAccountSchema),
})

const onDeleteAccount = deleteForm.handleSubmit(async (values) => {
  isDeletingAccount.value = true
  try {
    await $fetch<{ scheduledFor: string }>('/api/profile/delete', {
      method: 'POST',
      body: values,
    })

    showDeleteModal.value = false

    // L'endpoint signe out côté serveur — on nettoie aussi la session cliente
    await supabase.auth.signOut()
    await navigateTo('/login')
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string } }
    const msgKey = fetchErr.data?.message ?? 'profile.delete.errors.generic'
    toast.add({
      title: t(msgKey),
      color: 'error',
      icon: 'i-tabler-circle-x',
    })
  } finally {
    isDeletingAccount.value = false
  }
})

function openDeleteModal() {
  deleteForm.resetForm()
  showDeleteModal.value = true
}

// ─── Helpers affichage ────────────────────────────────────────────────────────

const userInitials = computed(() => {
  const name = profile.value?.fullName ?? supabaseUser.value?.email ?? ''
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')
})

const roleLabel = computed(() => {
  const roleMap: Record<string, string> = {
    ADMIN: 'Admin',
    FORMATEUR_PRINCIPAL: 'Formateur',
    CO_FORMATEUR: 'Co-formateur',
    STAGIAIRE: 'Stagiaire',
  }
  return profile.value?.globalRole
    ? (roleMap[profile.value.globalRole] ?? profile.value.globalRole)
    : null
})

const timezoneOptions = [
  'Europe/Paris',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC',
].map((tz) => ({ label: tz, value: tz }))

const localeOptions = [
  { label: t('profile.locales.fr'), value: 'fr' as const },
  { label: t('profile.locales.en'), value: 'en' as const },
]
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-10">
    <!-- En-tête -->
    <div class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
        {{ t('profile.title') }}
      </h1>
      <p class="mt-1 text-sm text-text-muted">
        {{ t('profile.subtitle') }}
      </p>
    </div>

    <!-- Skeleton chargement -->
    <div v-if="isLoading" class="space-y-6">
      <div class="skeleton h-28 rounded-xl" />
      <div class="skeleton h-64 rounded-xl" />
      <div class="skeleton h-48 rounded-xl" />
    </div>

    <template v-else-if="profile">
      <div class="space-y-6">

        <!-- ═══════════════════════════════════════════════════════════════
             SECTION — Avatar + identité
        ═══════════════════════════════════════════════════════════════ -->
        <UCard class="border border-border-subtle bg-surface">
          <template #header>
            <h2 class="font-medium text-text-strong">
              {{ t('profile.sections.identity') }}
            </h2>
          </template>

          <!-- Avatar -->
          <div class="flex items-start gap-6">
            <div class="relative shrink-0">
              <!-- Image ou initiales -->
              <div
                v-if="currentAvatarUrl"
                class="relative size-20 overflow-hidden rounded-full border border-border-subtle"
              >
                <img
                  :src="currentAvatarUrl"
                  :alt="profile.fullName
                    ? t('profile.avatar.altText', { name: profile.fullName })
                    : t('profile.avatar.altTextDefault')"
                  class="size-full object-cover"
                >
                <!-- Overlay upload en cours -->
                <div
                  v-if="isUploadingAvatar"
                  class="absolute inset-0 flex items-center justify-center bg-app/60"
                  aria-label="Upload en cours"
                  role="status"
                >
                  <UIcon name="i-tabler-loader-2" class="size-6 animate-spin text-text-on-accent" />
                </div>
              </div>

              <!-- Fallback initiales -->
              <div
                v-else
                class="relative flex size-20 items-center justify-center rounded-full border border-accent-border bg-accent-subtle"
                :aria-label="t('profile.avatar.altTextDefault')"
                role="img"
              >
                <span class="text-xl font-semibold text-accent-text" aria-hidden="true">
                  {{ userInitials }}
                </span>
                <!-- Overlay upload en cours sur le fallback -->
                <div
                  v-if="isUploadingAvatar"
                  class="absolute inset-0 flex items-center justify-center rounded-full bg-app/60"
                  role="status"
                  aria-label="Upload en cours"
                >
                  <UIcon name="i-tabler-loader-2" class="size-6 animate-spin text-accent" />
                </div>
              </div>
            </div>

            <!-- Infos + bouton upload -->
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="truncate font-medium text-text-strong">
                  {{ profile.fullName ?? supabaseUser?.email ?? '' }}
                </p>
                <UBadge
                  v-if="roleLabel"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ roleLabel }}
                </UBadge>
              </div>
              <p class="mt-0.5 truncate text-sm text-text-muted">{{ profile.email }}</p>

              <div class="mt-3 flex flex-wrap gap-2">
                <!-- Input file masqué (accessibilité : activé par le bouton) -->
                <input
                  ref="avatarInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="sr-only"
                  :aria-label="t('profile.avatar.label')"
                  @change="onAvatarChange"
                >
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  icon="i-tabler-upload"
                  :loading="isUploadingAvatar"
                  :disabled="isUploadingAvatar"
                  @click="triggerAvatarInput"
                >
                  {{ isUploadingAvatar ? t('profile.avatar.uploading') : t('profile.avatar.change') }}
                </UButton>
              </div>
              <p class="mt-1.5 text-xs text-text-subtle">{{ t('profile.avatar.uploadHint') }}</p>
            </div>
          </div>

          <!-- Champs identité -->
          <form
            class="mt-6 space-y-4"
            novalidate
            @submit.prevent
          >
            <UFormField
              :label="t('profile.fields.fullName')"
              name="fullName"
            >
              <UInput
                id="fullName"
                name="fullName"
                type="text"
                autocomplete="name"
                :placeholder="t('profile.fields.fullNamePlaceholder')"
                class="w-full"
                :model-value="profileForm.values.fullName ?? ''"
                @update:model-value="profileForm.setFieldValue('fullName', $event as string)"
                @blur="profileForm.validateField('fullName')"
              />
            </UFormField>

            <UFormField
              :label="t('profile.fields.bio')"
              name="bio"
            >
              <UTextarea
                id="bio"
                name="bio"
                :placeholder="t('profile.fields.bioPlaceholder')"
                :rows="3"
                class="w-full"
                :model-value="profileForm.values.bio ?? ''"
                @update:model-value="profileForm.setFieldValue('bio', $event as string)"
                @blur="profileForm.validateField('bio')"
              />
              <template #help>
                <span class="text-text-subtle">
                  {{ (profileForm.values.bio ?? '').length }}/500
                </span>
              </template>
            </UFormField>

            <!-- Email (non modifiable) -->
            <UFormField :label="t('profile.fields.email')">
              <UInput
                id="email"
                type="email"
                :value="profile.email"
                disabled
                class="w-full opacity-60"
                aria-disabled="true"
              />
            </UFormField>
          </form>
        </UCard>

        <!-- ═══════════════════════════════════════════════════════════════
             SECTION — Préférences (locale, timezone, profil public)
        ═══════════════════════════════════════════════════════════════ -->
        <UCard class="border border-border-subtle bg-surface">
          <template #header>
            <h2 class="font-medium text-text-strong">
              {{ t('profile.sections.preferences') }}
            </h2>
          </template>

          <div class="space-y-4">
            <!-- Langue -->
            <UFormField :label="t('profile.fields.locale')" name="locale">
              <USelect
                id="locale"
                name="locale"
                :options="localeOptions"
                option-attribute="label"
                value-attribute="value"
                class="w-full"
                :model-value="profileForm.values.locale ?? 'fr'"
                @update:model-value="profileForm.setFieldValue('locale', $event as 'fr' | 'en')"
              />
            </UFormField>

            <!-- Fuseau horaire -->
            <UFormField :label="t('profile.fields.timezone')" name="timezone">
              <USelect
                id="timezone"
                name="timezone"
                :options="timezoneOptions"
                option-attribute="label"
                value-attribute="value"
                class="w-full"
                :model-value="profileForm.values.timezone ?? 'Europe/Paris'"
                @update:model-value="profileForm.setFieldValue('timezone', $event as string)"
              />
            </UFormField>

            <!-- Toggle profil public -->
            <div class="flex items-center justify-between gap-4 rounded-lg border border-border-subtle px-4 py-3">
              <div>
                <p class="text-sm font-medium text-text-strong">
                  {{ t('profile.fields.isPublic') }}
                </p>
                <p class="text-xs text-text-muted">
                  {{ t('profile.fields.isPublicDescription') }}
                </p>
              </div>
              <UToggle
                id="isPublic"
                name="isPublic"
                :model-value="profileForm.values.isPublic ?? false"
                :aria-label="t('profile.fields.isPublic')"
                @update:model-value="profileForm.setFieldValue('isPublic', $event)"
              />
            </div>

            <!-- publicSlug (visible uniquement si isPublic) -->
            <UFormField
              v-if="profileForm.values.isPublic"
              :label="t('profile.fields.publicSlug')"
              name="publicSlug"
            >
              <UInput
                id="publicSlug"
                name="publicSlug"
                type="text"
                autocomplete="off"
                :placeholder="t('profile.fields.publicSlugPlaceholder')"
                class="w-full"
                :model-value="profileForm.values.publicSlug ?? ''"
                @update:model-value="profileForm.setFieldValue('publicSlug', ($event as string) || null)"
                @blur="profileForm.validateField('publicSlug')"
              />
              <template #help>
                <span class="text-text-subtle">{{ t('profile.fields.publicSlugHint') }}</span>
              </template>
            </UFormField>
          </div>
        </UCard>

        <!-- ═══════════════════════════════════════════════════════════════
             SECTION — Sécurité (2FA)
        ═══════════════════════════════════════════════════════════════ -->
        <UCard class="border border-border-subtle bg-surface">
          <template #header>
            <h2 class="font-medium text-text-strong">
              {{ t('profile.sections.security') }}
            </h2>
          </template>

          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-text-strong">
                {{ t('profile.security.twoFaTitle') }}
              </p>
              <div class="mt-1 flex items-center gap-2">
                <UBadge
                  :color="profile.twoFaEnabled ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                >
                  <UIcon
                    :name="profile.twoFaEnabled ? 'i-tabler-shield-check' : 'i-tabler-shield-off'"
                    class="mr-1 size-3"
                  />
                  {{ profile.twoFaEnabled ? t('profile.security.twoFaEnabled') : t('profile.security.twoFaDisabled') }}
                </UBadge>
              </div>
            </div>
            <UButton
              to="/settings/2fa"
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-tabler-settings"
            >
              {{ t('profile.security.manage2fa') }}
            </UButton>
          </div>
        </UCard>

        <!-- ═══════════════════════════════════════════════════════════════
             SECTION — Danger zone (suppression de compte)
        ═══════════════════════════════════════════════════════════════ -->
        <UCard class="border border-danger-fg/20 bg-surface">
          <template #header>
            <h2 class="font-medium text-danger-fg">
              {{ t('profile.sections.danger') }}
            </h2>
          </template>

          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-text-strong">
                {{ t('profile.delete.title') }}
              </p>
              <p class="mt-1 text-xs text-text-muted">
                {{ t('profile.delete.description') }}
              </p>
            </div>
            <UButton
              color="error"
              variant="soft"
              icon="i-tabler-trash"
              size="sm"
              @click="openDeleteModal"
            >
              {{ t('profile.delete.button') }}
            </UButton>
          </div>
        </UCard>

      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════════
         MODALE — Confirmation suppression de compte
    ═══════════════════════════════════════════════════════════════════ -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <div class="mb-4 flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-bg">
              <UIcon name="i-tabler-alert-triangle" class="size-5 text-danger-fg" />
            </div>
            <div>
              <h3 class="font-semibold text-text-strong">
                {{ t('profile.delete.confirmTitle') }}
              </h3>
              <p class="mt-1 text-sm text-text-muted">
                {{ t('profile.delete.confirmDescription') }}
              </p>
            </div>
          </div>

          <!-- Alerte danger -->
          <div
            class="mb-4 flex items-start gap-3 rounded-lg border border-danger-fg/20 bg-danger-bg px-4 py-3 text-sm text-danger-fg"
            role="alert"
          >
            <UIcon name="i-tabler-circle-x" class="mt-0.5 size-4 shrink-0" />
            <span>{{ t('profile.delete.description') }}</span>
          </div>

          <form novalidate class="space-y-4" @submit="onDeleteAccount">
            <UFormField
              :label="t('profile.delete.emailLabel')"
              name="email"
              required
            >
              <UInput
                id="delete-email"
                name="email"
                type="email"
                autocomplete="email"
                :placeholder="profile?.email ?? ''"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="t('profile.delete.passwordLabel')"
              name="password"
              required
            >
              <UInput
                id="delete-password"
                name="password"
                type="password"
                autocomplete="current-password"
                :placeholder="t('auth.passwordPlaceholder')"
                class="w-full"
              />
            </UFormField>

            <div class="flex gap-3 pt-2">
              <UButton
                type="submit"
                color="error"
                icon="i-tabler-trash"
                :loading="isDeletingAccount"
                :disabled="isDeletingAccount"
              >
                {{ t('profile.delete.confirmButton') }}
              </UButton>
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                :disabled="isDeletingAccount"
                @click="showDeleteModal = false"
              >
                {{ t('common.cancel') }}
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>
