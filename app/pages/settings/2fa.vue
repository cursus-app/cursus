<script setup lang="ts">
/**
 * Page de gestion 2FA TOTP.
 * Cf. ST-02.5 — TT-02.5.2 + TT-02.5.3 + TT-02.5.5.
 *
 * États :
 *  - 'idle'       : 2FA désactivée, bouton "Configurer"
 *  - 'enrolling'  : QR code affiché, saisie du premier code TOTP
 *  - 'active'     : 2FA activée, codes backup affichés / bouton "Désactiver"
 *  - 'disabling'  : modale de confirmation désactivation (mdp + code TOTP)
 */
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { disableTwoFaSchema, totpCodeSchema } from '~~/shared/schemas/twoFa'

definePageMeta({
  middleware: 'auth',
  layout: 'default',
})

useSeoMeta({ title: 'Authentification à deux facteurs — Cursus', robots: 'noindex' })

const { t } = useI18n()
const { enroll, verify, createChallenge, unenroll, listFactors } = useTwoFa()
const toast = useToast()

// ─── État global ──────────────────────────────────────────────────────────────

type PageState = 'loading' | 'idle' | 'enrolling' | 'active' | 'disabling'

const pageState = ref<PageState>('loading')
const isSubmitting = ref(false)

// ─── Données enrôlement ───────────────────────────────────────────────────────

interface EnrollData {
  factorId: string
  qrCode: string   // data:image/svg+xml;base64,... renvoyé par Supabase
  secret: string   // secret manuel (pour saisie sans caméra)
  uri: string
}
const enrollData = ref<EnrollData | null>(null)

// ─── Facteur TOTP actif ───────────────────────────────────────────────────────

interface ActiveFactor {
  id: string
  friendlyName: string | undefined
}
const activeFactor = ref<ActiveFactor | null>(null)

// ─── Codes de backup ──────────────────────────────────────────────────────────

const backupCodes = ref<string[]>([])
const showBackupCodes = ref(false)

// ─── Formulaire enrôlement ────────────────────────────────────────────────────

const enrollForm = useForm({ validationSchema: toTypedSchema(totpCodeSchema) })

// ─── Formulaire désactivation ─────────────────────────────────────────────────

const disableForm = useForm({ validationSchema: toTypedSchema(disableTwoFaSchema) })

// ─── Initialisation ───────────────────────────────────────────────────────────

async function initPage() {
  pageState.value = 'loading'
  try {
    const factors = await listFactors()
    const totpFactor = factors.totp.find((f) => f.status === 'verified')
    if (totpFactor) {
      activeFactor.value = { id: totpFactor.id, friendlyName: totpFactor.friendly_name ?? undefined }
      pageState.value = 'active'
    } else {
      pageState.value = 'idle'
    }
  } catch {
    pageState.value = 'idle'
  }
}

onMounted(() => { void initPage() })

// ─── Enrôlement ───────────────────────────────────────────────────────────────

async function startEnroll() {
  isSubmitting.value = true
  try {
    const data = await enroll()
    enrollData.value = {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    }
    pageState.value = 'enrolling'
  } catch {
    toast.add({
      title: t('2fa.errors.enrollFailed'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    })
  } finally {
    isSubmitting.value = false
  }
}

const onVerifyEnrollment = enrollForm.handleSubmit(async (values) => {
  if (!enrollData.value) { return }
  isSubmitting.value = true
  try {
    const challenge = await createChallenge(enrollData.value.factorId)
    await verify(enrollData.value.factorId, challenge.id, values.code)

    // Génération des codes de backup après activation réussie
    const resp = await $fetch<{ codes: string[] }>('/api/2fa/backup-codes', { method: 'POST' })
    backupCodes.value = resp.codes
    showBackupCodes.value = true

    activeFactor.value = { id: enrollData.value.factorId, friendlyName: undefined }
    enrollData.value = null
    pageState.value = 'active'

    toast.add({
      title: t('2fa.enrollSuccess'),
      color: 'success',
      icon: 'i-tabler-shield-check',
    })
  } catch {
    enrollForm.setFieldError('code', t('2fa.errors.invalidCode'))
  } finally {
    isSubmitting.value = false
  }
})

function cancelEnroll() {
  enrollData.value = null
  pageState.value = 'idle'
}

// ─── Désactivation ────────────────────────────────────────────────────────────

function startDisable() {
  pageState.value = 'disabling'
}

function cancelDisable() {
  disableForm.resetForm()
  pageState.value = 'active'
}

const onDisable = disableForm.handleSubmit(async (values) => {
  if (!activeFactor.value) { return }
  isSubmitting.value = true
  try {
    // Élever la session à AAL2 en vérifiant le code TOTP AVANT de désinscrire.
    // Sans cette étape, un attaquant avec accès à la session AAL1 pourrait
    // désactiver la 2FA sans connaître le code TOTP (authentication bypass).
    await challengeAndVerify(values.factorId, values.totpCode)
    await unenroll(values.factorId)

    activeFactor.value = null
    backupCodes.value = []
    showBackupCodes.value = false
    pageState.value = 'idle'

    toast.add({
      title: t('2fa.disableSuccess'),
      color: 'warning',
      icon: 'i-tabler-shield-off',
    })
  } catch {
    disableForm.setFieldError('totpCode', t('2fa.errors.invalidCode'))
  } finally {
    isSubmitting.value = false
  }
})

// ─── Régénération codes backup ────────────────────────────────────────────────

async function regenBackupCodes() {
  isSubmitting.value = true
  try {
    const resp = await $fetch<{ codes: string[] }>('/api/2fa/backup-codes', { method: 'POST' })
    backupCodes.value = resp.codes
    showBackupCodes.value = true
    toast.add({
      title: t('2fa.backupCodesRegenerated'),
      color: 'info',
      icon: 'i-tabler-refresh',
    })
  } catch {
    toast.add({
      title: t('2fa.errors.generic'),
      color: 'error',
      icon: 'i-tabler-circle-x',
    })
  } finally {
    isSubmitting.value = false
  }
}

// ─── QR code : decode base64 SVG pour affichage inline ───────────────────────

function decodeSvgQrCode(dataUrl: string): string {
  const base64 = dataUrl.replace('data:image/svg+xml;base64,', '')
  return globalThis.atob(base64)
}

// ─── Téléchargement codes backup ──────────────────────────────────────────────

function downloadBackupCodes() {
  const content = [
    'Cursus — Codes de backup 2FA',
    `Générés le : ${new Date().toLocaleDateString('fr-FR')}`,
    '',
    'Chaque code ne peut être utilisé qu\'une seule fois.',
    'Conservez ce fichier en lieu sûr.',
    '',
    ...backupCodes.value,
  ].join('\n')

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cursus-2fa-backup-codes.txt'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-10">
    <!-- En-tête -->
    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
          {{ t('2fa.title') }}
        </h1>
        <p class="mt-1 text-sm text-text-muted">
          {{ t('2fa.subtitle') }}
        </p>
      </div>
      <UBadge
        v-if="pageState !== 'loading'"
        :color="pageState === 'active' || pageState === 'disabling' ? 'success' : 'neutral'"
        variant="subtle"
        class="shrink-0"
      >
        <UIcon
          :name="pageState === 'active' || pageState === 'disabling' ? 'i-tabler-shield-check' : 'i-tabler-shield-off'"
          class="mr-1 size-3.5"
        />
        {{ pageState === 'active' || pageState === 'disabling' ? t('2fa.statusEnabled') : t('2fa.statusDisabled') }}
      </UBadge>
    </div>

    <!-- Skeleton chargement -->
    <div v-if="pageState === 'loading'" class="space-y-4">
      <div class="skeleton h-32 rounded-lg" />
    </div>

    <!-- ══════════════════════════════════════════════════════════════════
         ÉTAT : 2FA DÉSACTIVÉE
    ══════════════════════════════════════════════════════════════════ -->
    <template v-else-if="pageState === 'idle'">
      <UCard class="border border-border-subtle bg-surface">
        <div class="flex flex-col items-center gap-6 py-8 text-center">
          <div class="flex size-16 items-center justify-center rounded-full bg-muted">
            <UIcon name="i-tabler-shield" class="size-8 text-text-muted" />
          </div>
          <div>
            <p class="font-medium text-text-strong">{{ t('2fa.disabledTitle') }}</p>
            <p class="mt-1 text-sm text-text-muted">{{ t('2fa.disabledDescription') }}</p>
          </div>
          <UButton
            color="primary"
            icon="i-tabler-shield-plus"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            @click="startEnroll"
          >
            {{ t('2fa.setupButton') }}
          </UButton>
        </div>
      </UCard>
    </template>

    <!-- ══════════════════════════════════════════════════════════════════
         ÉTAT : ENRÔLEMENT EN COURS
    ══════════════════════════════════════════════════════════════════ -->
    <template v-else-if="pageState === 'enrolling' && enrollData">
      <div class="space-y-6">
        <!-- Étape 1 — Scanner le QR code -->
        <UCard class="border border-border-subtle bg-surface">
          <template #header>
            <div class="flex items-center gap-2 font-medium text-text-strong">
              <UIcon name="i-tabler-qrcode" class="size-5" />
              {{ t('2fa.step1Title') }}
            </div>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-text-muted">{{ t('2fa.step1Description') }}</p>

            <!-- QR Code -->
            <!-- eslint-disable-next-line vue/no-v-html — contenu SVG contrôlé depuis Supabase, pas d'input utilisateur -->
            <div
              v-if="enrollData.qrCode"
              class="flex justify-center rounded-lg bg-surface p-4"
              role="img"
              :aria-label="t('2fa.qrCodeAlt')"
              v-html="decodeSvgQrCode(enrollData.qrCode)"
            />

            <!-- Secret manuel (a11y — pour saisie sans caméra) -->
            <details class="mt-2">
              <summary class="cursor-pointer text-sm text-accent-text hover:underline">
                {{ t('2fa.manualEntryLink') }}
              </summary>
              <div class="mt-2 rounded-md bg-inset p-3">
                <p class="mb-1 text-xs text-text-muted">{{ t('2fa.manualEntryLabel') }}</p>
                <code class="select-all break-all font-mono text-sm text-text-strong">
                  {{ enrollData.secret }}
                </code>
              </div>
            </details>
          </div>
        </UCard>

        <!-- Étape 2 — Vérification du code -->
        <UCard class="border border-border-subtle bg-surface">
          <template #header>
            <div class="flex items-center gap-2 font-medium text-text-strong">
              <UIcon name="i-tabler-key" class="size-5" />
              {{ t('2fa.step2Title') }}
            </div>
          </template>

          <form novalidate @submit="onVerifyEnrollment">
            <!-- hidden field pour factorId -->
            <input type="hidden" name="factorId" :value="enrollData.factorId">

            <div class="space-y-4">
              <p class="text-sm text-text-muted">{{ t('2fa.step2Description') }}</p>

              <UFormField :label="t('2fa.codeLabel')" name="code" required>
                <UInput
                  id="totp-code"
                  name="code"
                  type="text"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  pattern="\d{6}"
                  maxlength="6"
                  :placeholder="t('2fa.codePlaceholder')"
                  class="w-full font-mono tracking-widest"
                />
              </UFormField>

              <div class="flex gap-3">
                <UButton
                  type="submit"
                  color="primary"
                  icon="i-tabler-shield-check"
                  :loading="isSubmitting"
                  :disabled="isSubmitting"
                >
                  {{ t('2fa.verifyButton') }}
                </UButton>
                <UButton
                  type="button"
                  color="neutral"
                  variant="ghost"
                  :disabled="isSubmitting"
                  @click="cancelEnroll"
                >
                  {{ t('common.cancel') }}
                </UButton>
              </div>
            </div>
          </form>
        </UCard>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════════════
         ÉTAT : 2FA ACTIVÉE
    ══════════════════════════════════════════════════════════════════ -->
    <template v-else-if="pageState === 'active'">
      <div class="space-y-6">
        <!-- Bannière de confirmation -->
        <div
          class="flex items-center gap-3 rounded-lg border border-success-fg/20 bg-success-bg px-4 py-3 text-sm text-success-fg"
          role="status"
        >
          <UIcon name="i-tabler-shield-check" class="size-5 shrink-0" />
          <span>{{ t('2fa.activeConfirmation') }}</span>
        </div>

        <!-- Codes de backup -->
        <UCard class="border border-border-subtle bg-surface">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 font-medium text-text-strong">
                <UIcon name="i-tabler-key-off" class="size-5" />
                {{ t('2fa.backupCodesTitle') }}
              </div>
              <div class="flex gap-2">
                <UButton
                  v-if="backupCodes.length > 0"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-tabler-download"
                  @click="downloadBackupCodes"
                >
                  {{ t('2fa.downloadCodes') }}
                </UButton>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-tabler-refresh"
                  :loading="isSubmitting"
                  @click="regenBackupCodes"
                >
                  {{ t('2fa.regenCodes') }}
                </UButton>
              </div>
            </div>
          </template>

          <template v-if="showBackupCodes && backupCodes.length > 0">
            <div
              role="region"
              :aria-label="t('2fa.backupCodesAria')"
              class="mb-4 rounded-md border border-warning-fg/20 bg-warning-bg px-4 py-3 text-sm text-warning-fg"
            >
              <UIcon name="i-tabler-alert-triangle" class="mr-2 inline size-4" />
              {{ t('2fa.backupCodesWarning') }}
            </div>

            <!-- Grille 2×4 des codes -->
            <ul
              class="grid grid-cols-2 gap-2"
              aria-label="Codes de backup"
            >
              <li
                v-for="code in backupCodes"
                :key="code"
                class="select-all rounded-md bg-inset px-3 py-2 text-center font-mono text-sm tracking-wider text-text-strong"
              >
                {{ code }}
              </li>
            </ul>
          </template>

          <template v-else>
            <p class="text-sm text-text-muted">{{ t('2fa.backupCodesHidden') }}</p>
          </template>
        </UCard>

        <!-- Désactivation -->
        <UCard class="border border-border-subtle bg-surface">
          <template #header>
            <div class="flex items-center gap-2 font-medium text-text-strong">
              <UIcon name="i-tabler-lock-open" class="size-5" />
              {{ t('2fa.disableTitle') }}
            </div>
          </template>

          <div class="flex items-center justify-between gap-4">
            <p class="text-sm text-text-muted">{{ t('2fa.disableDescription') }}</p>
            <UButton
              color="error"
              variant="soft"
              icon="i-tabler-shield-off"
              @click="startDisable"
            >
              {{ t('2fa.disableButton') }}
            </UButton>
          </div>
        </UCard>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════════════
         ÉTAT : MODALE DE DÉSACTIVATION
    ══════════════════════════════════════════════════════════════════ -->
    <template v-else-if="pageState === 'disabling'">
      <UCard class="border border-border-subtle bg-surface">
        <template #header>
          <div class="flex items-center gap-2 font-medium text-text-strong">
            <UIcon name="i-tabler-shield-off" class="size-5 text-danger-fg" />
            {{ t('2fa.confirmDisableTitle') }}
          </div>
        </template>

        <form novalidate @submit="onDisable">
          <!-- hidden field factorId -->
          <input
            v-if="activeFactor"
            type="hidden"
            name="factorId"
            :value="activeFactor.id"
          >

          <div class="space-y-4">
            <div
              class="flex items-start gap-3 rounded-lg border border-danger-fg/20 bg-danger-bg px-4 py-3 text-sm text-danger-fg"
              role="alert"
            >
              <UIcon name="i-tabler-alert-triangle" class="mt-0.5 size-4 shrink-0" />
              <span>{{ t('2fa.confirmDisableWarning') }}</span>
            </div>

            <UFormField :label="t('auth.password')" name="password" required>
              <UInput
                id="disable-password"
                name="password"
                type="password"
                autocomplete="current-password"
                :placeholder="t('auth.passwordPlaceholder')"
                class="w-full"
              />
            </UFormField>

            <UFormField :label="t('2fa.codeLabel')" name="totpCode" required>
              <UInput
                id="disable-totp"
                name="totpCode"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                pattern="\d{6}"
                maxlength="6"
                :placeholder="t('2fa.codePlaceholder')"
                class="w-full font-mono tracking-widest"
              />
            </UFormField>

            <div class="flex gap-3">
              <UButton
                type="submit"
                color="error"
                icon="i-tabler-shield-off"
                :loading="isSubmitting"
                :disabled="isSubmitting"
              >
                {{ t('2fa.confirmDisableButton') }}
              </UButton>
              <UButton
                type="button"
                color="neutral"
                variant="ghost"
                :disabled="isSubmitting"
                @click="cancelDisable"
              >
                {{ t('common.cancel') }}
              </UButton>
            </div>
          </div>
        </form>
      </UCard>
    </template>
  </div>
</template>
