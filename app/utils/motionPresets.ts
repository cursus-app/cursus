/**
 * motionPresets — presets de configuration pour @vueuse/motion / v-motion.
 *
 * Conventions :
 * - Toutes les durées sont en ms et calées sur les tokens du design system
 *   (--duration-instant: 100ms, --duration-fast: 200ms, --duration-base: 300ms).
 * - Les animations > 200ms DOIVENT être wrappées dans une vérification
 *   `useReducedMotion()` côté appelant.
 * - Les transformations utilisent uniquement `transform` (GPU) et `opacity`.
 *   Jamais `width`, `height`, `top`, `left` (force layout reflow).
 * - `staggerItem` plafonne le délai à 200ms (max ~10 items visibles).
 */

/** Valeur scalaire ou keyframes d'animation */
type ScaleValue = number | readonly number[];

/** Translation (px ou %) */
type TranslateValue = number | string;

/** Options d'une transition @vueuse/motion */
interface MotionTransition {
  duration?: number;
  delay?: number;
  easing?: string;
}

/** Propriétés d'une variante de mouvement */
interface MotionVariantProperties {
  opacity?: number;
  scale?: ScaleValue;
  y?: TranslateValue;
  x?: TranslateValue;
}

/** Variante enrichie d'une transition */
interface MotionVariant extends MotionVariantProperties {
  transition?: MotionTransition;
}

/** Preset complet (état initial + état final animé) */
export interface MotionPreset {
  initial: MotionVariantProperties;
  enter: MotionVariant;
}

/**
 * Presets motion partagés à travers l'application.
 *
 * Usage dans un composant Vue :
 * ```vue
 * <div v-motion="motionPresets.fadeIn" />
 * ```
 *
 * Ou avec le preset stagger (basé sur l'index dans une liste) :
 * ```vue
 * <div v-for="(item, i) in items" :key="item.id"
 *      v-motion="motionPresets.staggerItem(i)" />
 * ```
 */
export const motionPresets = {
  /**
   * Modal mobile : slide depuis le bas (300ms ease-out).
   * > 200ms → respecter useReducedMotion() côté appelant.
   */
  modalMobile: {
    initial: { y: '100%', opacity: 0 },
    enter: { y: 0, opacity: 1, transition: { duration: 300, easing: 'ease-out' } },
  } satisfies MotionPreset,

  /**
   * Modal desktop : scale 0.95 → 1 + fade (250ms ease-out).
   * > 200ms → respecter useReducedMotion() côté appelant.
   */
  modalDesktop: {
    initial: { scale: 0.95, opacity: 0 },
    enter: { scale: 1, opacity: 1, transition: { duration: 250, easing: 'ease-out' } },
  } satisfies MotionPreset,

  /**
   * Popover : scale 0.95 → 1 + fade (150ms — sous le seuil reduced-motion).
   */
  popover: {
    initial: { scale: 0.95, opacity: 0 },
    enter: { scale: 1, opacity: 1, transition: { duration: 150 } },
  } satisfies MotionPreset,

  /**
   * Bounce : keyframes scale pour validation livrable/badge XP (300ms).
   * > 200ms → respecter useReducedMotion() côté appelant.
   */
  bounce: {
    initial: { scale: 1 },
    enter: {
      scale: [1, 1.12, 0.95, 1.05, 1] as const,
      transition: { duration: 300 },
    },
  } satisfies MotionPreset,

  /**
   * FadeIn : opacité 0 → 1 (200ms — sous le seuil reduced-motion).
   */
  fadeIn: {
    initial: { opacity: 0 },
    enter: { opacity: 1, transition: { duration: 200 } },
  } satisfies MotionPreset,

  /**
   * SlideDown : descend de -8px + fade (200ms — seuil reduced-motion).
   * Utilisé par la Cmd+K palette.
   */
  slideDown: {
    initial: { y: -8, opacity: 0 },
    enter: { y: 0, opacity: 1, transition: { duration: 200 } },
  } satisfies MotionPreset,

  /**
   * StaggerItem : apparition décalée pour les listes.
   *
   * - Délai = index × 20ms, plafonné à 200ms (correspond à ~10 items visibles max).
   * - Au-delà du 10e item, les rows apparaissent directement (délai = 200ms).
   *
   * @param index - Position de l'item dans la liste (0-based)
   */
  staggerItem: (index: number): MotionPreset => ({
    initial: { opacity: 0, y: 8 },
    enter: {
      opacity: 1,
      y: 0,
      transition: { delay: Math.min(index * 20, 200), duration: 200 },
    },
  }),
} as const;

export type MotionPresetKey = keyof typeof motionPresets;
