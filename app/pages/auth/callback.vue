<script setup lang="ts">
/**
 * Page de retour OAuth GitHub.
 * Supabase redirige ici après le flux OAuth avec les tokens dans l'URL.
 * @nuxtjs/supabase intercepte automatiquement les fragments/query params
 * et établit la session côté client.
 *
 * Flux :
 * 1. Supabase callback URL → cette page
 * 2. getSession() confirme que la session est établie
 * 3. On stocke le github_handle en DB via /api/profile/github-connect
 * 4. On redirige vers /dashboard (ou returnTo)
 */

// Route publique — pas de garde auth ici (on est en plein flux OAuth)
definePageMeta({ middleware: [] })

const { t } = useI18n()

useSeoMeta({
  title: t('auth.github.connecting'),
  robots: 'noindex',
})

const router = useRouter()
const supabase = useSupabaseClient()
const toast = useToast()

onMounted(async () => {
  // @nuxtjs/supabase gère l'échange de code automatiquement.
  // On attend que la session soit établie.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    await router.replace('/login?error=oauth_failed')
    return
  }

  // Stocker le github_handle depuis les user_metadata Supabase
  const githubHandle = session.user.user_metadata?.['user_name'] as string | undefined

  if (githubHandle) {
    try {
      await $fetch('/api/profile/github-connect', {
        method: 'POST',
        body: { githubHandle },
      })
      toast.add({
        title: t('auth.github.connected'),
        description: `@${githubHandle}`,
        color: 'success',
        icon: 'i-tabler-brand-github',
      })
    } catch {
      // Non bloquant — le handle sera re-sync au prochain login OAuth.
      // Pas de toast d'erreur ici (ne pas bloquer l'onboarding).
    }
  }

  // Rediriger vers returnTo ou le dashboard
  const returnTo = new URLSearchParams(window.location.search).get('returnTo') ?? '/dashboard'
  await router.replace(returnTo)
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-app">
    <div class="flex flex-col items-center gap-4 text-text-muted" role="status" aria-live="polite">
      <span
        class="i-tabler-loader-2 size-8 animate-spin text-accent"
        aria-hidden="true"
      />
      <p class="text-sm">{{ $t('auth.github.connecting') }}</p>
    </div>
  </div>
</template>
