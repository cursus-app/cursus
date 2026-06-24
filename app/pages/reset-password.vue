<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useField, useForm } from 'vee-validate';
import { resetPasswordSchema } from '~~/shared/schemas/auth';
import { AuthError } from '~/composables/useAuth';

definePageMeta({
  layout: 'auth',
  // Pas de middleware auth ici : Supabase injecte la session via le hash de l'URL
  // avant que le middleware soit exécuté. On gère manuellement ci-dessous.
});

const { t } = useI18n();

useSeoMeta({
  title: t('auth.passwordReset'),
  robots: 'noindex',
});

const { updatePassword } = useAuth();
const router = useRouter();
const supabase = useSupabaseClient();

// Supabase envoie le token de reset dans le hash de l'URL (#access_token=...).
// Le module @nuxtjs/supabase gère la détection automatique de la session via
// onAuthStateChange PKCE — pas besoin de parser le hash manuellement.
const sessionReady = ref(false);
const tokenError = ref(false);

// On attend la session Supabase (initialisée par le hash de l'URL de reset)
onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    sessionReady.value = true;
  } else {
    tokenError.value = true;
  }
});

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(resetPasswordSchema),
});

const serverError = ref<string | null>(null);
const success = ref(false);

const { value: passwordValue } = useField<string>('password');

const onSubmit = handleSubmit(async (values) => {
  serverError.value = null;
  try {
    await updatePassword(values.password);
    success.value = true;
    // Redirige vers /login après 2s pour que l'utilisateur lise le message de succès
    setTimeout(() => {
      void router.push('/login');
    }, 2000);
  } catch (error) {
    if (error instanceof AuthError) {
      serverError.value = t(error.i18nKey);
    } else {
      serverError.value = t('auth.errors.generic');
    }
  }
});
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
        {{ t('auth.passwordReset') }}
      </h1>
    </div>

    <!-- Token expiré ou invalide -->
    <div
      v-if="tokenError"
      role="alert"
      class="flex items-start gap-3 rounded-lg border border-danger-fg/20 bg-danger-bg px-4 py-4 text-sm text-danger-fg"
    >
      <UIcon name="i-tabler-link-off" class="mt-0.5 size-5 shrink-0" />
      <div>
        <p>{{ t('auth.resetTokenExpired') }}</p>
        <NuxtLink
          to="/forgot-password"
          class="mt-1 inline-block font-medium underline hover:no-underline"
        >
          {{ t('auth.requestNewResetLink') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Succès -->
    <div
      v-else-if="success"
      role="alert"
      aria-live="polite"
      class="flex items-center gap-3 rounded-lg border border-success-fg/20 bg-success-bg px-4 py-4 text-sm text-success-fg"
    >
      <UIcon name="i-tabler-circle-check" class="size-5 shrink-0" />
      <span>{{ t('auth.passwordResetSuccess') }}</span>
    </div>

    <!-- Formulaire (sessionReady garantit qu'on a un access_token valide) -->
    <template v-else-if="sessionReady">
      <div
        v-if="serverError"
        role="alert"
        aria-live="assertive"
        class="mb-6 flex items-center gap-3 rounded-lg border border-danger-fg/20 bg-danger-bg px-4 py-3 text-sm text-danger-fg"
      >
        <UIcon name="i-tabler-circle-x" class="size-5 shrink-0" />
        <span>{{ serverError }}</span>
      </div>

      <form novalidate @submit="onSubmit">
        <div class="space-y-5">
          <UFormField :label="t('auth.password')" name="password" required>
            <UInput
              id="password"
              name="password"
              type="password"
              autocomplete="new-password"
              autofocus
              :placeholder="t('auth.newPasswordPlaceholder')"
              class="w-full"
            />
            <MoleculesPasswordStrengthIndicator :password="passwordValue ?? ''" />
          </UFormField>

          <UFormField :label="t('auth.passwordConfirm')" name="passwordConfirm" required>
            <UInput
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              autocomplete="new-password"
              :placeholder="t('auth.passwordConfirmPlaceholder')"
              class="w-full"
            />
          </UFormField>

          <UButton
            type="submit"
            color="primary"
            size="lg"
            class="w-full"
            :loading="isSubmitting"
            :disabled="isSubmitting"
          >
            {{ t('auth.saveNewPassword') }}
          </UButton>
        </div>
      </form>
    </template>

    <!-- Loading : attente de la session Supabase -->
    <div v-else class="flex justify-center py-8">
      <UIcon name="i-tabler-loader-2" class="size-8 animate-spin text-accent" />
    </div>
  </div>
</template>
