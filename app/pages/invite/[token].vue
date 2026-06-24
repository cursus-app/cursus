<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { acceptInvitationSchema } from '~~/shared/schemas/invitation';

// Page publique — pas de middleware d'auth
definePageMeta({ middleware: [] });

useSeoMeta({
  title: 'Rejoindre Cursus',
  robots: 'noindex', // Lien unique — non indexé
});

const route = useRoute();
const rawToken = route.params['token'];
const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
const encodedToken = computed(() => encodeURIComponent(token ?? ''));

// Vérification du token sans consommation
const {
  data: invitation,
  error,
  pending,
} = await useFetch(() => `/api/invitations/${encodedToken.value}`, {
  key: `invitation-${token}`,
});

// Formulaire typé via Zod
const { handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(acceptInvitationSchema),
});

const serverError = ref<string | null>(null);
const accountCreated = ref(false);

const onAccept = handleSubmit(async (values) => {
  serverError.value = null;

  try {
    await $fetch(`/api/invitations/${encodedToken.value}/accept`, {
      method: 'POST',
      body: {
        password: values.password,
        ...(values.fullName ? { fullName: values.fullName } : {}),
      },
    });
    accountCreated.value = true;
    await navigateTo('/login?message=account_created');
  } catch (err: unknown) {
    const h3Err = err as { data?: { message?: string } };
    const msgKey = h3Err.data?.message ?? 'invitation.errors.generic';
    serverError.value = getErrorMessage(msgKey);
  }
});

/**
 * Traduit les codes d'erreur serveur en messages lisibles.
 * Sera remplacé par i18n (useI18n) quand les clés seront ajoutées aux locales.
 */
function getErrorMessage(key: string): string {
  const messages: Record<string, string> = {
    'invitation.expiredOrInvalid': "Ce lien d'invitation est invalide ou expiré.",
    'invitation.alreadyAccepted': 'Cette invitation a déjà été utilisée.',
    'invitation.signupFailed': 'La création du compte a échoué. Contacte ton formateur.',
    'auth.errors.passwordTooShort': 'Le mot de passe doit contenir au moins 12 caractères.',
    'auth.errors.passwordNeedsUppercase': 'Le mot de passe doit contenir une majuscule.',
    'auth.errors.passwordNeedsLowercase': 'Le mot de passe doit contenir une minuscule.',
    'auth.errors.passwordNeedsDigit': 'Le mot de passe doit contenir un chiffre.',
    'auth.errors.passwordNeedsSymbol': 'Le mot de passe doit contenir un symbole.',
  };
  return messages[key] ?? 'Une erreur est survenue. Réessaie ou contacte ton formateur.';
}

/** Libellé lisible du rôle */
const roleLabel = computed(() => {
  if (!invitation.value) {
    return '';
  }
  return invitation.value.role === 'CO_FORMATEUR' ? 'Co-formateur' : 'Stagiaire';
});
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-app px-4 py-12">
    <!-- Lien skip pour accessibilité -->
    <a
      href="#main"
      class="sr-only z-50 bg-accent px-4 py-2 text-text-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-md"
    >
      Aller au contenu
    </a>

    <!-- Logo -->
    <div class="mb-8 text-center">
      <NuxtLink to="/" class="inline-flex items-center gap-2 text-accent-text hover:opacity-80">
        <UIcon name="i-tabler-shield-check" class="size-7 text-accent" />
        <span class="text-xl font-semibold text-text-strong">Cursus</span>
      </NuxtLink>
    </div>

    <!-- Contenu principal -->
    <main id="main" class="w-full max-w-md">
      <!-- Chargement -->
      <div v-if="pending" class="flex justify-center py-12" aria-label="Vérification du lien…">
        <UIcon
          name="i-tabler-loader-2"
          class="size-8 animate-spin text-accent"
          aria-hidden="true"
        />
      </div>

      <!-- Invitation invalide / expirée -->
      <div
        v-else-if="error || !invitation"
        class="rounded-xl border border-border-subtle bg-surface p-8 text-center"
        role="alert"
      >
        <UIcon
          name="i-tabler-link-off"
          class="mx-auto mb-4 size-12 text-text-muted"
          aria-hidden="true"
        />
        <h1 class="text-xl font-semibold text-text-strong">Invitation invalide ou expirée</h1>
        <p class="mt-2 text-sm text-text-muted">
          Ce lien d'invitation n'est plus valide. Demande une nouvelle invitation à ton formateur.
        </p>
        <UButton to="/login" variant="outline" class="mt-6" leading-icon="i-tabler-arrow-left">
          Retour à la connexion
        </UButton>
      </div>

      <!-- Formulaire de création de compte -->
      <div v-else class="rounded-xl border border-border-subtle bg-surface p-8 shadow-md">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-text-strong">Tu es invité·e&nbsp;!</h1>
          <p class="mt-2 text-text-muted">
            Rejoins la cohorte
            <strong class="text-text-strong">{{ invitation.cohorteName }}</strong>
            en tant que <strong class="text-text-strong">{{ roleLabel }}</strong
            >.
          </p>
          <!-- Email pré-rempli non modifiable -->
          <p class="mt-1 text-sm text-text-subtle">
            <UIcon name="i-tabler-mail" class="mr-1 inline size-4" aria-hidden="true" />
            {{ invitation.email }}
          </p>
        </div>

        <!-- Erreur serveur -->
        <div
          v-if="serverError"
          role="alert"
          aria-live="assertive"
          class="mb-4 flex items-center gap-3 rounded-lg border border-danger-fg/20 bg-danger-bg px-4 py-3 text-sm text-danger-fg"
        >
          <UIcon name="i-tabler-circle-x" class="size-5 shrink-0" aria-hidden="true" />
          <span>{{ serverError }}</span>
        </div>

        <form novalidate @submit="onAccept">
          <div class="space-y-5">
            <!-- Nom complet optionnel -->
            <UFormField label="Nom complet (optionnel)" name="fullName">
              <UInput
                id="fullName"
                name="fullName"
                type="text"
                autocomplete="name"
                placeholder="Karim Benzéma"
                class="w-full"
              />
            </UFormField>

            <!-- Mot de passe -->
            <UFormField label="Mot de passe" name="password" required>
              <UInput
                id="password"
                name="password"
                type="password"
                autocomplete="new-password"
                placeholder="12 caractères minimum"
                class="w-full"
                autofocus
              />
              <template #hint>
                <span class="text-xs text-text-subtle">
                  Majuscule, minuscule, chiffre et symbole requis.
                </span>
              </template>
            </UFormField>

            <UButton
              type="submit"
              color="primary"
              size="lg"
              class="w-full"
              :loading="isSubmitting"
              :disabled="isSubmitting"
            >
              Créer mon compte
            </UButton>
          </div>
        </form>

        <!-- Pied de page -->
        <p class="mt-6 text-center text-xs text-text-subtle">
          Déjà un compte&nbsp;?
          <NuxtLink
            to="/login"
            class="text-accent-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Se connecter
          </NuxtLink>
        </p>
      </div>
    </main>

    <!-- Footer -->
    <p class="mt-8 text-xs text-text-subtle">
      &copy; {{ new Date().getFullYear() }} Cursus. Tous droits réservés.
    </p>
  </div>
</template>
