<script setup lang="ts">
/**
 * AppSearchInput — champ de recherche avec hint Cmd+K.
 *
 * Wrapper UInput (@nuxt/ui) enrichi :
 *   - Icône loupe à gauche
 *   - Hint clavier Cmd/Ctrl+K à droite (via UKbd)
 *   - Bouton clear quand valeur non vide
 *   - Émet l'événement `search` sur Enter (en plus du v-model)
 *   - Raccourci Cmd+K global optionnel (activé via `enableShortcut`)
 */

interface Props {
  modelValue?: string;
  placeholder?: string | null;
  /** Active le raccourci clavier global Cmd/Ctrl+K pour focus. */
  enableShortcut?: boolean;
  /** Désactive le champ. */
  disabled?: boolean;
  /** Classe(s) CSS supplémentaires. */
  class?: string;
  /** Taille du champ (sm / md / lg). */
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: null,
  enableShortcut: true,
  disabled: false,
  class: '',
  size: 'md',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  search: [value: string];
}>();

const { t } = useI18n();

const inputRef = ref<HTMLInputElement | null>(null);

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

function clear() {
  emit('update:modelValue', '');
  nextTick(() => inputRef.value?.focus());
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    emit('search', model.value);
  }
}

/** Raccourci global Cmd/Ctrl+K. */
if (import.meta.client) {
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (props.enableShortcut && event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      inputRef.value?.focus();
    }
  });
}

/** Label du raccourci clavier (Mac vs autres). */
const shortcutLabel = computed(() => {
  if (!import.meta.client) {
    return '⌘K';
  }
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform ?? '') ? '⌘K' : 'Ctrl+K';
});
</script>

<template>
  <div :class="['relative flex items-center', props.class]">
    <UInput
      ref="inputRef"
      v-model="model"
      :placeholder="props.placeholder ?? t('molecules.searchInput.placeholder')"
      :disabled="props.disabled"
      :size="props.size"
      leading-icon="i-tabler-search"
      class="w-full"
      :ui="{
        trailing: 'pr-16',
      }"
      @keydown="onKeydown"
    >
      <template #trailing>
        <!-- Bouton clear -->
        <button
          v-if="model.length > 0"
          type="button"
          :aria-label="t('molecules.searchInput.clear')"
          class="flex items-center justify-center rounded p-0.5 text-text-muted transition-colors hover:text-text-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          @click="clear"
        >
          <span class="i-tabler-x size-3.5" aria-hidden="true" />
        </button>

        <!-- Hint Cmd+K (masqué quand du texte est saisi ou sur mobile) -->
        <span
          v-else-if="props.enableShortcut"
          :aria-label="t('molecules.searchInput.shortcut')"
          class="flex items-center gap-0.5 text-xs text-text-subtle"
        >
          <kbd
            class="rounded border border-border-subtle bg-muted px-1 py-0.5 font-mono text-xs text-text-muted"
          >
            {{ shortcutLabel }}
          </kbd>
        </span>
      </template>
    </UInput>
  </div>
</template>
