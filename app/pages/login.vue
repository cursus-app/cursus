<script setup lang="ts">
/**
 * Page de connexion — email/mot de passe + step TOTP si 2FA active.
 *
 * Flow :
 *  1. L'utilisateur soumet email + mot de passe.
 *  2. Supabase authentifie (AAL1).
 *  3. On vérifie via getAssuranceLevel() si une vérification TOTP est requise (AAL2).
 *  4. Si oui → afficher le step TOTP.
 *  5. Une fois challengeAndVerify() réussi → rediriger vers /dashboard.
 *
 * Cf. ST-02.5 — TT-02.5.4 (Step de saisie 2FA dans le flow login).
 */
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
const { getAssuranceLevel, listFactors, challengeAndVerify } = useTwoFa();
const router = useRouter();

// Message d'invitation uniquement redirigé
const route = useRoute();
const invitationOnlyMessage = computed(() =>
  route.query['invitation'] === 'required' ? t('auth.invitationOnly') : null,
);

// ─── Step courant : 'credentials' | 'totp' ────────────────────────────────────

type LoginStep = 'credentials' | 'totp';
const currentStep = ref<LoginStep>('credentials');

// ─── Formulaire credentials ───────────────────────────────────────────────────

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

    // Vérifier si une 2FA challenge est requise
    const { currentLevel, nextLevel } = await getAssuranceLevel();
    if (currentLevel === 'aal1' && nextLevel === 'aal2') {
      // 2FA requise — charger le facteur actif et afficher le step TOTP
      const factors = await listFactors();
      const totpFactor = factors.totp.find((f) => f.status === 'verified');
      if (totpFactor) {
        activeTotpFactorId.value = totpFactor['id'];
        currentStep.value = 'totp';
        return;
      }
    }

    // Pas de 2FA → redirection directe
    // /dashboard est créé dans ST-03.x — route connue mais page pas encore générée.
    // eslint-disable-next-line link-checker/valid-route
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

// ─── Step TOTP ────────────────────────────────────────────────────────────────

const activeTotpFactorId = ref<string | null>(null);
const totpCode = ref('');
const totpError = ref<string | null>(null);
const isVerifyingTotp = ref(false);

async function submitTotpCode() {
  if (!activeTotpFactorId.value || totpCode.value.length !== 6) {
    return;
  }

  isVerifyingTotp.value = true;
  totpError.value = null;
  try {
    await challengeAndVerify(activeTotpFactorId.value, totpCode.value);
    // eslint-disable-next-line link-checker/valid-route
    await router.push('/dashboard');
  } catch {
    totpError.value = t('2fa.errors.invalidCode');
    totpCode.value = '';
  } finally {
    isVerifyingTotp.value = false;
  }
}

function backToCredentials() {
  currentStep.value = 'credentials';
  activeTotpFactorId.value = null;
  totpCode.value = '';
  totpError.value = null;
}

// TODO ST-15.4 : rate limiting Upstash Redis (5 tentatives / 5 min / IP+email)
// TODO : Cloudflare Turnstile captcha après 5 échecs
</script>

<template>
  <div>
    <!-- ══════════════════════════════════════════════════════════════════
         STEP 1 : Email + mot de passe
    ══════════════════════════════════════════════════════════════════ -->
    <template v-if="currentStep === 'credentials'">
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
    </template>

    <!-- ══════════════════════════════════════════════════════════════════
         STEP 2 : Code TOTP
    ══════════════════════════════════════════════════════════════════ -->
    <template v-else-if="currentStep === 'totp'">
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent-subtle"
        >
          <UIcon name="i-tabler-shield-lock" class="size-7 text-accent-text" />
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-text-strong">
          {{ t('2fa.loginStepTitle') }}
        </h1>
        <p class="mt-2 text-sm text-text-muted">
          {{ t('2fa.loginStepDescription') }}
        </p>
      </div>

      <!-- Erreur TOTP -->
      <div
        v-if="totpError"
        role="alert"
        aria-live="assertive"
        class="mb-6 flex items-center gap-3 rounded-lg border border-danger-fg/20 bg-danger-bg px-4 py-3 text-sm text-danger-fg"
      >
        <UIcon name="i-tabler-circle-x" class="size-5 shrink-0" />
        <span>{{ totpError }}</span>
      </div>

      <form novalidate @submit.prevent="submitTotpCode">
        <div class="space-y-5">
          <div>
            <label for="totp-login-code" class="mb-1.5 block text-sm font-medium text-text-strong">
              {{ t('2fa.codeLabel') }}
              <span aria-hidden="true" class="text-danger-fg"> *</span>
            </label>
            <input
              id="totp-login-code"
              v-model="totpCode"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              pattern="\d{6}"
              maxlength="6"
              :placeholder="t('2fa.codePlaceholder')"
              :disabled="isVerifyingTotp"
              class="w-full rounded-md border border-border-default bg-surface px-3 py-2 text-center font-mono text-lg tracking-[0.5em] text-text-strong placeholder:text-text-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-required="true"
              autofocus
            />
          </div>

          <UButton
            type="submit"
            color="primary"
            size="lg"
            class="w-full"
            :loading="isVerifyingTotp"
            :disabled="isVerifyingTotp || totpCode.length !== 6"
          >
            {{ t('2fa.verifyButton') }}
          </UButton>

          <div class="text-center">
            <button
              type="button"
              class="text-sm text-text-muted hover:text-text-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              @click="backToCredentials"
            >
              <UIcon name="i-tabler-arrow-left" class="mr-1 inline size-4" />
              {{ t('2fa.backToLogin') }}
            </button>
          </div>

          <!-- Lien codes backup — redirige vers /settings/2fa -->
          <!-- eslint-disable-next-line link-checker/valid-route -->
          <p class="text-center text-xs text-text-subtle">
            {{ t('2fa.lostPhone') }}
            <NuxtLink
              to="/settings/2fa"
              class="text-accent-text hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {{ t('2fa.useBackupCode') }}
            </NuxtLink>
          </p>
        </div>
      </form>
    </template>
  </div>
</template>
