<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { loginSchema } from '~~/shared/schemas/auth';
import { AuthError } from '~/composables/useAuth';

definePageMeta({
  layout: 'auth',
  middleware: 'auth',
});

const { t } = useI18n();

useSeoMeta({
  title: t('auth.login'),
  robots: 'noindex', // Pages d'auth non indexées
});

const { login } = useAuth();
const router = useRouter();

// Message d'invitation uniquement redirigé
const route = useRoute();
const invitationOnlyMessage = computed(() =>
  route.query['invitation'] === 'required' ? t('auth.invitationOnly') : null,
);

const { handleSubmit, isSubmitting, setFieldError } = useForm({
  validationSchema: toTypedSchema(loginSchema),
});

// Message d'erreur générique — jamais spécifique à l'email ou au mot de passe
// (anti user enumeration — cf. considérations sécurité ST-02.1)
const serverError = ref<string | null>(null);

const onSubmit = handleSubmit(async (values) => {
  serverError.value = null;
  try {
    await login(values.email, values.password);
    // /dashboard est créé dans ST-03.x — route connue mais page pas encore générée.
    // eslint-disable-next-line link-checker/valid-sitemap-link
    await router.push('/dashboard');
  } catch (error) {
    if (error instanceof AuthError) {
      serverError.value = t(error.i18nKey);
    } else {
      serverError.value = t('auth.errors.generic');
    }
    // Effacement immédiat du mot de passe — sécurité
    setFieldError('password', undefined);
  }
});

// TODO ST-15.4 : rate limiting Upstash Redis (5 tentatives / 5 min / IP+email)
// TODO : Cloudflare Turnstile captcha après 5 échecs
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
        {{ t('auth.login') }}
      </h1>
      <p class="mt-2 text-sm text-text-muted">
        {{ t('auth.loginSubtitle') }}
      </p>
    </div>

    <!-- Message invitation uniquement (redirect depuis /signup sans token) -->
    <div
      v-if="invitationOnlyMessage"
      role="alert"
      class="mb-6 flex items-center gap-3 rounded-lg border border-warning-fg/20 bg-warning-bg px-4 py-3 text-sm text-warning-fg"
    >
      <UIcon name="i-tabler-alert-triangle" class="size-5 shrink-0" />
      <span>{{ invitationOnlyMessage }}</span>
    </div>

    <!-- Erreur serveur générique -->
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
        <UFormField :label="t('auth.email')" name="email" required>
          <UInput
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            autofocus
            :placeholder="t('auth.emailPlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('auth.password')" name="password" required>
          <UInput
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            :placeholder="t('auth.passwordPlaceholder')"
            class="w-full"
          />
          <template #hint>
            <NuxtLink
              to="/forgot-password"
              class="text-xs text-accent-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {{ t('auth.forgotPassword') }}
            </NuxtLink>
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
          {{ t('auth.login') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
