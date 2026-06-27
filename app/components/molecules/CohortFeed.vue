<script setup lang="ts">
/**
 * CohortFeed — Molecule « Fil de la cohorte ».
 *
 * Affiche les 3 derniers événements positifs de la cohorte
 * (validations, badges obtenus). Pas de PII (noms/emails).
 *
 * Accessibilité :
 *   - <time datetime="..."> pour chaque événement
 *   - Icônes décoratives aria-hidden
 *
 * ST-13.1
 */
import type { DashboardFeedItem } from '~/composables/useDashboard';

interface Props {
  feed: DashboardFeedItem[];
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const { t, locale } = useI18n();

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function eventIcon(type: DashboardFeedItem['type']): string {
  if (type === 'BADGE') {
    return 'i-tabler-award';
  }
  return 'i-tabler-circle-check';
}

function eventLabel(item: DashboardFeedItem): string {
  if (item.type === 'BADGE' && item.badgeName) {
    return t('dashboard.feed.badgeAwarded', { badge: item.badgeName });
  }
  if (item.type === 'VALIDATION' && item.moduleTitle) {
    return t('dashboard.feed.moduleValidated', { module: item.moduleTitle });
  }
  return t('dashboard.feed.genericEvent');
}
</script>

<template>
  <section aria-labelledby="feed-heading">
    <h2
      id="feed-heading"
      class="mb-4 text-sm font-semibold tracking-wide text-text-subtle uppercase"
    >
      {{ t('dashboard.feed.title') }}
    </h2>

    <!-- Skeleton -->
    <template v-if="props.isLoading">
      <div class="space-y-4">
        <div v-for="i in 3" :key="i" class="flex items-start gap-3">
          <CSkeleton class="size-8 rounded-full" :rounded="true" />
          <div class="flex-1">
            <CSkeleton class="mb-1.5 h-4 w-full" />
            <CSkeleton class="h-3 w-20" />
          </div>
        </div>
      </div>
    </template>

    <!-- État vide -->
    <template v-else-if="props.feed.length === 0">
      <p class="text-sm text-text-muted">
        {{ t('dashboard.feed.empty') }}
      </p>
    </template>

    <!-- Liste d'événements -->
    <ul v-else class="space-y-4" role="list">
      <li v-for="(item, index) in props.feed" :key="index" class="flex items-start gap-3">
        <!-- Icône événement -->
        <div
          class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-success-bg"
          aria-hidden="true"
        >
          <span :class="[eventIcon(item.type), 'size-4 text-success-fg']" />
        </div>

        <!-- Contenu -->
        <div class="min-w-0 flex-1">
          <p class="text-sm text-text-default">
            {{ eventLabel(item) }}
          </p>
          <time :datetime="item.occurredAt" class="text-xs text-text-muted">
            {{ formatDate(item.occurredAt) }}
          </time>
        </div>
      </li>
    </ul>
  </section>
</template>
