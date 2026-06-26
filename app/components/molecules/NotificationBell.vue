<script setup lang="ts">
/**
 * NotificationBell — cloche dans le header avec badge compteur et panneau déroulant.
 *
 * A11y :
 *   - bouton role="button", aria-label dynamique
 *   - badge compteur lisible par les lecteurs d'écran
 *   - panneau aria-live="polite" pour les nouvelles notifs
 *   - compteur > 99 → affiche "99+"
 */
import { useNotifications } from '~/composables/useNotifications';

const {
  notifications,
  unreadCount,
  isLoading,
  fetch,
  markRead,
  markAllRead,
  remove,
  startPolling,
  stopPolling,
} = useNotifications();

const isOpen = ref(false);

/** Badge affiché (max 99+). */
const badgeLabel = computed(() => {
  if (unreadCount.value > 99) {
    return '99+';
  }
  return unreadCount.value > 0 ? String(unreadCount.value) : null;
});

/** Label a11y du bouton cloche. */
const bellAriaLabel = computed(() => {
  if (unreadCount.value === 0) {
    return 'Notifications — aucune non lue';
  }
  return `Notifications — ${unreadCount.value} non lue${unreadCount.value > 1 ? 's' : ''}`;
});

/** Ouvrir / fermer le panneau. */
function togglePanel() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    fetch();
  }
}

/** Marquer une notif comme lue puis fermer si clic. */
async function handleItemClick(id: string) {
  await markRead(id);
}

onMounted(() => {
  fetch();
  startPolling(30_000);
});

onUnmounted(() => {
  stopPolling();
});

/** Fermer le panneau si clic extérieur (via v-click-outside n'est pas dispo, on utilise focus-out). */
function handlePanelBlur(event: FocusEvent) {
  const target = event.relatedTarget as HTMLElement | null;
  const panel = document.getElementById('notification-panel');
  if (panel && target && panel.contains(target)) {
    return;
  }
  isOpen.value = false;
}
</script>

<template>
  <div class="relative" @focusout="handlePanelBlur">
    <!-- Bouton cloche -->
    <UButton
      color="neutral"
      variant="ghost"
      :aria-label="bellAriaLabel"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      aria-controls="notification-panel"
      class="relative"
      @click="togglePanel"
    >
      <UIcon name="i-tabler-bell" class="text-xl" />

      <!-- Badge compteur -->
      <span
        v-if="badgeLabel"
        class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-solid px-1 text-[10px] font-bold text-white"
        aria-hidden="true"
      >
        {{ badgeLabel }}
      </span>
    </UButton>

    <!-- Annonce a11y pour nouvelles notifs (hors écran) -->
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
      <span v-if="unreadCount > 0">
        {{ unreadCount }} nouvelle{{ unreadCount > 1 ? 's' : '' }} notification{{
          unreadCount > 1 ? 's' : ''
        }}
      </span>
    </div>

    <!-- Panneau déroulant -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-1 scale-95"
    >
      <div
        v-if="isOpen"
        id="notification-panel"
        role="region"
        aria-label="Centre de notifications"
        class="absolute top-full right-0 z-50 mt-2 w-80 rounded-xl border border-border-subtle bg-surface shadow-lg focus:outline-none"
        tabindex="-1"
      >
        <!-- En-tête -->
        <div class="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 class="text-sm font-semibold text-text-strong">Notifications</h2>
          <UButton
            v-if="unreadCount > 0"
            color="neutral"
            variant="ghost"
            size="xs"
            label="Tout marquer lu"
            @click="markAllRead"
          />
        </div>

        <!-- Liste -->
        <div class="max-h-96 overflow-y-auto">
          <!-- État chargement -->
          <div v-if="isLoading" class="flex justify-center py-8">
            <UIcon name="i-tabler-loader-2" class="animate-spin text-2xl text-text-muted" />
          </div>

          <!-- Empty state -->
          <div
            v-else-if="notifications.length === 0"
            class="flex flex-col items-center gap-2 py-10 text-center"
          >
            <UIcon name="i-tabler-bell-off" class="text-3xl text-text-subtle" />
            <p class="text-sm text-text-muted">Aucune notification pour l'instant</p>
          </div>

          <!-- Items -->
          <ul
            v-else
            class="group divide-y divide-border-subtle"
            aria-label="Liste des notifications"
          >
            <NotificationItem
              v-for="notif in notifications"
              :id="notif.id"
              :key="notif.id"
              :type="notif.type"
              :title="notif.title"
              :body="notif.body"
              :read-at="notif.readAt"
              :created-at="notif.createdAt"
              @click="handleItemClick"
              @delete="remove"
            />
          </ul>
        </div>

        <!-- Pied de panneau — lien vers /notifications ajouté dans ST-12.3 -->
        <div class="border-t border-border-subtle px-4 py-2 text-center">
          <button type="button" class="text-xs text-accent hover:underline" @click="isOpen = false">
            Voir toutes les notifications
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
