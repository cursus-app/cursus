<script setup lang="ts">
/**
 * CommandPalette — overlay global Cmd+K / Ctrl+K.
 *
 * Monté une seule fois dans app.vue (composant global).
 * Raccourcis clavier : meta_k (macOS) + ctrl_k (Windows/Linux).
 * La liste de groupes est vide au MVP ; les providers seront branchés en ST-20.2+.
 *
 * A11y : role="dialog" + aria-modal="true" gérés par Reka UI (DialogContent).
 *        Titre visuellement caché (sr-only) pour aria-labelledby implicite.
 * Perf  : composant toujours monté mais contenu inerte tant que isOpen=false.
 */

const { isOpen, open, close, toggle } = useCommandPalette();
const reducedMotion = useReducedMotion();
const { t } = useI18n();
const { track } = useAnalytics();
const route = useRoute();
const { user } = useAuth();

// ─── Raccourcis Cmd+K / Ctrl+K ───────────────────────────────────────────────
// usingInput: true → fonctionne même si le focus est dans un <input>/<textarea>
// Cas limites task : Cmd+K dans un textarea ouvre la palette (intentionnel).
defineShortcuts({
  meta_k: { handler: toggle, usingInput: true },
  ctrl_k: { handler: toggle, usingInput: true },
});

// ─── Analytics ───────────────────────────────────────────────────────────────
// watch sur isOpen (pas sur le computed setter) pour capturer toute source d'ouverture
// (Cmd+K via defineShortcuts, open() programmatique, etc.).
let hasTracked = false;

watch(isOpen, (val) => {
  if (val && !hasTracked) {
    hasTracked = true;
    track('cmdk_opened', {
      user_id: user.value?.['id'] ?? 'anonymous',
      route: route.path,
      method: 'kbd',
    });
  }
});

// ─── Binding v-model bidirectionnel vers le state global ─────────────────────
const modalOpen = computed({
  get: () => isOpen.value,
  set: (val: boolean) => (val ? open() : close()),
});

// ─── Fermeture depuis le bouton interne du UCommandPalette ───────────────────
function onCommandPaletteClose(val: boolean) {
  if (!val) {
    close();
  }
}
</script>

<template>
  <!--
    UModal : portal rendu en dehors du DOM principal → z-index naturellement élevé.
    transition=false si prefers-reduced-motion (WCAG 2.3.3 + CSS fallback main.css).
    close=false : on délègue le bouton de fermeture à UCommandPalette (`:close="true"`).
  -->
  <!--
    :title passe dans DialogTitle (VisuallyHidden quand #content est utilisé)
    → aria-labelledby automatiquement connecté par Reka UI.
  -->
  <UModal
    v-model:open="modalOpen"
    :title="t('commandPalette.ariaLabel')"
    :transition="!reducedMotion"
    :fullscreen="false"
    :close="false"
    :ui="{
      content: 'sm:max-w-xl',
      overlay: 'backdrop-blur-sm',
    }"
  >
    <template #content>
      <!--
        UCommandPalette :
        - groups=[] au MVP (aucune commande — état vide intentionnel)
        - close=true affiche le bouton ×  dans l'input, émet update:open=false
        - autofocus focus l'input dès l'ouverture (AC Scénario 1)
      -->
      <UCommandPalette
        :groups="[]"
        :placeholder="t('commandPalette.placeholder')"
        :close="true"
        close-icon="i-tabler-x"
        autofocus
        @update:open="onCommandPaletteClose"
      >
        <!-- Slot empty : affiché quand aucun résultat (état initial au MVP). -->
        <template #empty>
          <div
            class="flex flex-col items-center justify-center gap-2 py-10"
            aria-live="polite"
            aria-atomic="true"
          >
            <UIcon name="i-tabler-search" class="size-8 text-text-subtle" aria-hidden="true" />
            <p class="text-sm text-text-muted">
              {{ t('commandPalette.emptyState') }}
            </p>
          </div>
        </template>
      </UCommandPalette>
    </template>
  </UModal>
</template>
