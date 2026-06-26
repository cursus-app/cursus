/**
 * useNotifications — composable pour le centre de notifications in-app.
 *
 * Fournit :
 *  - notifications : liste courante
 *  - unreadCount   : nombre non lus (pour le badge)
 *  - isLoading     : état de chargement
 *  - error         : message d'erreur éventuel
 *  - fetch()       : (re)chargement depuis l'API
 *  - markRead()    : marquer une notif comme lue
 *  - markAllRead() : tout marquer comme lu
 *  - remove()      : supprimer une notif
 *  - startPolling() / stopPolling() : polling 30 s (fallback Realtime)
 */

import type { NotificationType } from '@prisma/client';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: NotificationItem[];
  meta: {
    total: number;
    unreadCount: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export function useNotifications() {
  // Refs locales à l'instance — utiliser un store Pinia si partage entre composants
  // multiples est nécessaire.
  const notifications = ref<NotificationItem[]>([]);
  const unreadCount = ref<number>(0);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  let pollingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Charge les notifications depuis l'API.
   */
  async function fetch(unreadOnly = false) {
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch<NotificationsResponse>('/api/notifications', {
        query: { unreadOnly: unreadOnly ? 'true' : undefined },
      });
      // Cloner chaque item pour éviter les mutations du tableau source (important en tests).
      notifications.value = res.data.map((n) => ({ ...n }));
      unreadCount.value = res.meta.unreadCount;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement des notifications';
      error.value = message;
    } finally {
      isLoading.value = false;
    }
  }

  /** Marque une notification comme lue (optimistic update). */
  async function markRead(id: string) {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index === -1) {
      return;
    }

    const prev = notifications.value[index];
    if (!prev || prev.readAt !== null) {
      return;
    } // déjà lue

    // Optimistic
    notifications.value[index] = { ...prev, readAt: new Date().toISOString() };
    unreadCount.value = Math.max(0, unreadCount.value - 1);

    try {
      await $fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      // Rollback
      notifications.value[index] = prev;
      unreadCount.value = unreadCount.value + 1;
    }
  }

  /** Marque toutes les notifications non lues comme lues. */
  async function markAllRead() {
    const prevUnread = unreadCount.value;
    const prevNotifications = [...notifications.value];

    // Optimistic
    notifications.value = notifications.value.map((n) =>
      n.readAt === null ? { ...n, readAt: new Date().toISOString() } : n,
    );
    unreadCount.value = 0;

    try {
      await $fetch('/api/notifications/read-all', { method: 'PATCH' });
    } catch {
      // Rollback
      notifications.value = prevNotifications;
      unreadCount.value = prevUnread;
    }
  }

  /** Supprime une notification (optimistic). */
  async function remove(id: string) {
    const prevNotifications = [...notifications.value];
    const notif = notifications.value.find((n) => n.id === id);
    const wasUnread = notif?.readAt === null;

    // Optimistic
    notifications.value = notifications.value.filter((n) => n.id !== id);
    if (wasUnread) {
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }

    try {
      await $fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    } catch {
      // Rollback
      notifications.value = prevNotifications;
      if (wasUnread) {
        unreadCount.value = unreadCount.value + 1;
      }
    }
  }

  /** Démarre le polling toutes les X millisecondes (fallback Realtime). */
  function startPolling(intervalMs = 30_000) {
    stopPolling();
    pollingInterval = setInterval(() => void fetch(), intervalMs);
  }

  /** Arrête le polling. */
  function stopPolling() {
    if (pollingInterval !== null) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  return {
    notifications: readonly(notifications),
    unreadCount: readonly(unreadCount),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetch,
    markRead,
    markAllRead,
    remove,
    startPolling,
    stopPolling,
  };
}
