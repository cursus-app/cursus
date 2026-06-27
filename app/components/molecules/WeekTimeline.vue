<script setup lang="ts">
/**
 * WeekTimeline — timeline des modules du cursus avec statuts.
 *
 * Affiche les modules passés, courant et futurs avec des indicateurs visuels :
 *  - VALIDE/VALIDE_OVERRIDE : point vert (module terminé)
 *  - SOUMIS : point bleu (soumis, en attente de validation)
 *  - EN_COURS/EN_ALERTE/BLOQUE/EN_RETARD : point accent (module courant)
 *  - A_VENIR : point gris (module à venir)
 *
 * A11y : navigation clavier (Tab par module), rôle list/listitem.
 */

import type { TimelineModule, ProgressionStatus } from '~/composables/useCurrentWeek';

const props = defineProps<{
  modules: TimelineModule[];
  currentCohortModuleId?: string | null;
}>();

const { t } = useI18n();

/** Classe de couleur du point de statut */
function dotColorClass(status: ProgressionStatus, isCurrentModule: boolean): string {
  if (status === 'VALIDE' || status === 'VALIDE_OVERRIDE') {
    return 'bg-success-solid';
  }
  if (status === 'SOUMIS' || isCurrentModule) {
    return 'bg-accent';
  }
  if (status === 'EN_RETARD' || status === 'BLOQUE') {
    return 'bg-danger-solid';
  }
  if (status === 'EN_ALERTE') {
    return 'bg-warning-solid';
  }
  return 'bg-muted';
}

/** Icône du statut */
function statusIcon(status: ProgressionStatus): string {
  switch (status) {
    case 'VALIDE':
    case 'VALIDE_OVERRIDE':
      return 'i-tabler-circle-check';
    case 'SOUMIS':
      return 'i-tabler-clock-check';
    case 'EN_COURS':
      return 'i-tabler-player-play';
    case 'EN_RETARD':
      return 'i-tabler-clock-exclamation';
    case 'BLOQUE':
      return 'i-tabler-lock';
    case 'EN_ALERTE':
      return 'i-tabler-alert-triangle';
    default:
      return 'i-tabler-circle-dashed';
  }
}

/** Libellé i18n du statut */
function statusLabel(status: ProgressionStatus): string {
  return t(`week.status.${status}` as Parameters<typeof t>[0]);
}

function isCurrentModule(module: TimelineModule): boolean {
  return module.cohortModuleId === props.currentCohortModuleId;
}
</script>

<template>
  <nav :aria-label="t('week.timeline.ariaLabel')">
    <ol class="relative space-y-0" role="list">
      <li
        v-for="(mod, index) in modules"
        :key="mod.cohortModuleId"
        class="relative flex items-start gap-4 pb-6 last:pb-0"
        :aria-current="isCurrentModule(mod) ? 'step' : undefined"
      >
        <!-- Trait de connexion entre les points (sauf dernier) -->
        <div
          v-if="index < modules.length - 1"
          class="absolute top-5 left-[9px] h-full w-0.5 bg-border-subtle"
          aria-hidden="true"
        />

        <!-- Point de statut -->
        <div class="relative z-10 shrink-0">
          <div
            class="flex size-5 items-center justify-center rounded-full ring-2 ring-app"
            :class="dotColorClass(mod.status, isCurrentModule(mod))"
            :aria-label="statusLabel(mod.status)"
          >
            <span
              :class="[statusIcon(mod.status), 'size-3 text-text-on-accent']"
              aria-hidden="true"
            />
          </div>
        </div>

        <!-- Contenu du module -->
        <div
          class="min-w-0 flex-1 rounded-lg p-3 transition-colors"
          :class="
            isCurrentModule(mod)
              ? 'border border-accent-border bg-accent-subtle'
              : 'hover:bg-subtle'
          "
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs font-medium tracking-wide text-text-muted uppercase">
                {{ t('week.timeline.week', { n: mod.week }) }}
              </p>
              <p
                class="mt-0.5 truncate text-sm font-medium"
                :class="isCurrentModule(mod) ? 'text-accent-text' : 'text-text-default'"
              >
                {{ mod.title }}
              </p>
            </div>
            <!-- Badge de statut textuel pour les lecteurs d'écran et affichage -->
            <span
              class="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              :class="{
                'bg-success-bg text-success-fg':
                  mod.status === 'VALIDE' || mod.status === 'VALIDE_OVERRIDE',
                'bg-accent-subtle text-accent-text':
                  mod.status === 'SOUMIS' || mod.status === 'EN_COURS',
                'bg-warning-bg text-warning-fg': mod.status === 'EN_ALERTE',
                'bg-danger-bg text-danger-fg':
                  mod.status === 'EN_RETARD' || mod.status === 'BLOQUE',
                'bg-muted text-text-muted': mod.status === 'A_VENIR',
              }"
            >
              {{ statusLabel(mod.status) }}
            </span>
          </div>

          <!-- Date limite si module courant ou en retard -->
          <p
            v-if="isCurrentModule(mod) || mod.status === 'EN_RETARD'"
            class="mt-1 text-xs text-text-muted"
          >
            {{
              mod.isLate
                ? t('week.timeline.lateDays', { days: Math.abs(mod.daysLeft) })
                : t('week.timeline.daysLeft', { days: mod.daysLeft })
            }}
          </p>
        </div>
      </li>

      <!-- État vide -->
      <li v-if="modules.length === 0">
        <p class="text-sm text-text-muted">{{ t('week.timeline.empty') }}</p>
      </li>
    </ol>
  </nav>
</template>
