<script setup lang="ts">
/**
 * Carte de connexion / déconnexion GitHub.
 * Affichée sur /profil et dans l'onboarding (étape 3).
 *
 * Props :
 *   - currentHandle : handle GitHub actuellement lié, null si non connecté.
 */

interface Props {
  currentHandle?: string | null
}

const { currentHandle = null } = defineProps<Props>()

const { connectGitHub, disconnectGitHub } = useGitHubOAuth()
const toast = useToast()
const { t } = useI18n()

const isConnecting = ref(false)
const isDisconnecting = ref(false)

async function onConnect(): Promise<void> {
  isConnecting.value = true
  try {
    await connectGitHub()
    // La page est redirigée vers GitHub → pas de toast ici,
    // c'est la page /auth/callback qui gère le toast de succès.
  } catch {
    toast.add({
      title: t('errors.generic'),
      description: t('auth.github.oauthFailed'),
      color: 'error',
      icon: 'i-tabler-alert-triangle',
    })
    isConnecting.value = false
  }
}

async function onDisconnect(): Promise<void> {
  isDisconnecting.value = true
  try {
    await disconnectGitHub()
    toast.add({
      title: t('auth.github.disconnected'),
      color: 'success',
      icon: 'i-tabler-circle-check',
    })
    // Recharger la page profil pour mettre à jour l'état
    // /profil est créé dans ST-03.x — route connue mais page pas encore générée.
    // eslint-disable-next-line link-checker/valid-route
    await navigateTo('/profil', { replace: true })
  } catch {
    toast.add({
      title: t('errors.generic'),
      description: t('auth.github.oauthFailed'),
      color: 'error',
      icon: 'i-tabler-alert-triangle',
    })
  } finally {
    isDisconnecting.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-border-subtle bg-surface p-6">
    <div class="flex items-center gap-3">
      <span class="i-tabler-brand-github size-6 text-text-default" aria-hidden="true" />
      <div class="flex-1">
        <p class="font-medium text-text-strong">GitHub</p>
        <p
          v-if="currentHandle"
          class="text-sm text-text-muted"
        >
          {{ $t('auth.github.connectedAs') }}
          <span class="font-mono text-text-default">@{{ currentHandle }}</span>
        </p>
        <p v-else class="text-sm text-text-muted">
          {{ $t('auth.github.notConnected') }}
        </p>
      </div>

      <div>
        <UButton
          v-if="!currentHandle"
          variant="solid"
          color="primary"
          :loading="isConnecting"
          :disabled="isConnecting"
          icon="i-tabler-brand-github"
          :aria-label="$t('auth.github.connectButton')"
          @click="onConnect"
        >
          {{ $t('auth.github.connectButton') }}
        </UButton>
        <UButton
          v-else
          variant="ghost"
          color="neutral"
          :loading="isDisconnecting"
          :disabled="isDisconnecting"
          icon="i-tabler-refresh"
          :aria-label="$t('auth.github.reconnectButton')"
          @click="onDisconnect"
        >
          {{ $t('auth.github.reconnectButton') }}
        </UButton>
      </div>
    </div>

    <!-- Alerte si GitHub non connecté (requis pour soumettre) -->
    <div
      v-if="!currentHandle"
      class="mt-3 flex items-center gap-2 rounded-lg bg-warning-bg px-3 py-2"
      role="alert"
      aria-live="polite"
    >
      <span class="i-tabler-alert-triangle size-4 text-warning-fg" aria-hidden="true" />
      <p class="text-sm text-warning-fg">{{ $t('auth.github.required') }}</p>
    </div>
  </div>
</template>
