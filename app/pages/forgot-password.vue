<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useForm } from 'vee-validate';
import { forgotPasswordSchema } from '~~/shared/schemas/auth';

definePageMeta({
  layout: 'auth',
  middleware: 'auth',
});

const { t } = useI18n();

useSeoMeta({
  title: t('auth.forgotPasswordTitle'),
  robots: 'noindex',
});

const { forgotPassword } = useAuth();

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(forgotPasswordSchema),
});

// Toujours afficher un message de succès — même si l'email n'existe pas
// (anti user enumeration)
const submitted = ref(false);

const onSubmit = handleSubmit(async (values) => {
  // forgotPassword() ne rejette jamais pour ne pas révéler l'existence du compte
  await forgotPassword(values.email);
  submitted.value = true;
});
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
        {{ t('auth.forgotPasswordTitle') }}
      </h1>
      <p class="mt-2 text-sm text-text-muted">
        {{ t('auth.forgotPasswordSubtitle') }}
      </p>
    </div>

    <!-- Message de succès — identique qu'un compte existe ou non -->
    <div
      v-if="submitted"
      role="alert"
      aria-live="polite"
      class="flex items-start gap-3 rounded-lg border border-success-fg/20 bg-success-bg px-4 py-4 text-sm text-success-fg"
    >
      <UIcon name="i-tabler-mail-check" class="mt-0.5 size-5 shrink-0" />
      <span>{{ t('auth.checkEmail') }}</span>
    </div>

    <form v-else novalidate @submit="onSubmit">
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

        <UButton
          type="submit"
          color="primary"
          size="lg"
          class="w-full"
          :loading="isSubmitting"
          :disabled="isSubmitting"
        >
          {{ t('auth.sendResetLink') }}
        </UButton>
      </div>
    </form>

    <div class="mt-6 text-center">
      <NuxtLink
        to="/login"
        class="text-sm text-accent-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {{ t('auth.backToLogin') }}
      </NuxtLink>
    </div>
  </div>
</template>
