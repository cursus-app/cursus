<script setup lang="ts">
/**
 * NotificationItem — un élément de la liste de notifications.
 *
 * Affiche : icône (selon le type), titre, corps optionnel, temps relatif.
 * Émet `click` (pour marquer comme lu) et `delete` (pour supprimer).
 */
import type { NotificationType } from '@prisma/client';

interface Props {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  readAt: string | null;
  createdAt: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  click: [id: string];
  delete: [id: string];
}>();

/** Icône Tabler selon le type de notification. */
const iconByType: Record<NotificationType, string> = {
  INVITATION: 'i-tabler-mail-forward',
  SUBMISSION_VALIDATED: 'i-tabler-circle-check',
  SUBMISSION_FAILED: 'i-tabler-circle-x',
  MONTHLY_OBJECTIVE_MET: 'i-tabler-target',
  ALERT_RAISED: 'i-tabler-alert-triangle',
  BADGE_AWARDED: 'i-tabler-award',
  CAPSTONE_EVALUATED: 'i-tabler-certificate',
  CERTIFICATE_ISSUED: 'i-tabler-file-certificate',
  WEEKLY_DIGEST: 'i-tabler-calendar-week',
};

const icon = computed(() => iconByType[props.type] ?? 'i-tabler-bell');

/** Couleur de l'icône selon l'importance du type. */
const iconColorClass = computed<string>(() => {
  if (props.type === 'ALERT_RAISED') {
    return 'text-warning-fg';
  }
  if (props.type === 'SUBMISSION_FAILED') {
    return 'text-danger-fg';
  }
  if (props.type === 'SUBMISSION_VALIDATED' || props.type === 'BADGE_AWARDED') {
    return 'text-success-fg';
  }
  return 'text-text-muted';
});

const isUnread = computed(() => props.readAt === null);

/** Temps relatif (ex. « il y a 2 h »). */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) {
    return "à l'instant";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `il y a ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `il y a ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

const timeAgo = computed(() => relativeTime(props.createdAt));
</script>

<template>
  <li
    :class="[
      'flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors',
      'hover:bg-muted',
      isUnread ? 'bg-accent/5' : 'bg-surface',
    ]"
    role="listitem"
    @click="emit('click', props.id)"
  >
    <!-- Icône -->
    <span :class="['mt-0.5 shrink-0 text-xl', iconColorClass]" :aria-label="props.type">
      <UIcon :name="icon" />
    </span>

    <!-- Contenu -->
    <div class="min-w-0 flex-1">
      <p
        :class="[
          'truncate text-sm',
          isUnread ? 'font-semibold text-text-strong' : 'font-normal text-text-default',
        ]"
      >
        {{ props.title }}
      </p>
      <p v-if="props.body" class="mt-0.5 line-clamp-2 text-xs text-text-muted">
        {{ props.body }}
      </p>
      <p class="mt-1 text-xs text-text-subtle">{{ timeAgo }}</p>
    </div>

    <!-- Badge non lu -->
    <span
      v-if="isUnread"
      class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
      aria-hidden="true"
    />

    <!-- Bouton supprimer -->
    <UButton
      color="neutral"
      variant="ghost"
      size="xs"
      icon="i-tabler-x"
      :aria-label="`Supprimer : ${props.title}`"
      class="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
      @click.stop="emit('delete', props.id)"
    />
  </li>
</template>
