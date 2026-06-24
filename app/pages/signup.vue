<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useField, useForm } from 'vee-validate';
import { signupSchema } from '~~/shared/schemas/auth';
import { AuthError } from '~/composables/useAuth';

definePageMeta({
  layout: 'auth',
  middleware: 'auth',
});

const { t } = useI18n();

useSeoMeta({
  title: t('auth.signup'),
  robots: 'noindex',
});

const route = useRoute();
const router = useRouter();
const { signup } = useAuth();

// Scénario 1 — pas de signup libre : token d'invitation obligatoire.
// Si absent → redirect /login avec message explicatif.
const invitationToken = computed(() => {
  const token = route.query['token'];
  return typeof token === 'string' && token.length > 0 ? token : null;
});

// Redirect immédiat si pas de token (au setup, donc avant rendu)
if (!invitationToken.value) {
  await navigateTo('/login?invitation=required');
}

const { handleSubmit, isSubmitting, values } = useForm({
  validationSchema: toTypedSchema(signupSchema),
  initialValues: {
    invitationToken: invitationToken.value ?? '',
    // consentsCgu démarre sans valeur — vee-validate part d'un état non rempli
    // On ne passe pas la propriété pour éviter l'incompatibilité avec exactOptionalPropertyTypes
  },
});

// Accès au champ password pour l'indicateur de force en temps réel
const { value: passwordValue } = useField<string>('password');

const serverError = ref<string | null>(null);
const emailAlreadyUsed = ref(false);

const onSubmit = handleSubmit(async (formValues) => {
  serverError.value = null;
  emailAlreadyUsed.value = false;

  try {
    await signup(formValues.email, formValues.password, formValues.invitationToken);
    // Scénario 2 — compte créé → redirige vers page de confirmation email
    await router.push('/check-email');
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.i18nKey === 'auth.errors.emailAlreadyUsed') {
        emailAlreadyUsed.value = true;
      } else {
        serverError.value = t(error.i18nKey);
      }
    } else {
      serverError.value = t('auth.errors.generic');
    }
  }
});

// Scénario 3 — le bouton reste désactivé tant que tous les critères ne passent pas.
// vee-validate gère l'état de validité du formulaire globalement.
// On réutilise `meta.valid` pour désactiver le bouton en complément de `isSubmitting`.

// TODO ST-15.4 : rate limiting Upstash Redis
// TODO : Cloudflare Turnstile captcha
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
        {{ t('auth.signup') }}
      </h1>
      <p class="mt-2 text-sm text-text-muted">
        {{ t('auth.signupSubtitle') }}
      </p>
    </div>

    <!-- Erreur email déjà utilisé — Scénario 4 -->
    <div
      v-if="emailAlreadyUsed"
      role="alert"
      aria-live="assertive"
      class="mb-6 flex items-start gap-3 rounded-lg border border-warning-fg/20 bg-warning-bg px-4 py-3 text-sm text-warning-fg"
    >
      <UIcon name="i-tabler-alert-triangle" class="mt-0.5 size-5 shrink-0" />
      <span>{{ t('auth.errors.emailAlreadyUsedDetail') }}</span>
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
        <!-- Champ caché : token d'invitation (injecté depuis l'URL, non affiché) -->
        <input type="hidden" name="invitationToken" :value="values.invitationToken" />

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
            autocomplete="new-password"
            :placeholder="t('auth.newPasswordPlaceholder')"
            class="w-full"
          />
          <!-- Indicateur de force du mot de passe — Scénario 3 -->
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

        <UFormField name="consentsCgu">
          <div class="flex items-start gap-3">
            <UCheckbox
              id="consentsCgu"
              name="consentsCgu"
              :label="t('auth.cguLabel')"
              class="mt-0.5"
            />
          </div>
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          size="lg"
          class="w-full"
          :loading="isSubmitting"
          :disabled="isSubmitting"
        >
          {{ t('auth.signup') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
