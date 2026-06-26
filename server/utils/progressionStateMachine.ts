/**
 * Machine à états progression stagiaire × module.
 * Cf. docs/state-machines/progression.md pour le diagramme complet.
 *
 * Convention : transitions validées par VALID_TRANSITIONS avant toute mutation DB.
 * États terminaux (VALIDE, VALIDE_OVERRIDE) : aucune transition autorisée.
 */
import type { Progression, ProgressionStatus, PrismaClient } from '@prisma/client';
import { logger } from './logger';

// ─── Erreur métier ────────────────────────────────────────────────────────────

export class InvalidTransitionError extends Error {
  readonly from: ProgressionStatus;
  readonly to: ProgressionStatus;

  constructor(from: ProgressionStatus, to: ProgressionStatus) {
    super(`Transition invalide : ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
  }
}

// ─── Matrice des transitions valides ─────────────────────────────────────────
//
// Clé   = état source
// Valeur = états cibles autorisés
//
// VALIDE et VALIDE_OVERRIDE sont terminaux → absents de la Map (pas de départ).
// La transition * → VALIDE_OVERRIDE est gérée séparément (any source, role-gated).

export const VALID_TRANSITIONS = new Map<ProgressionStatus, ProgressionStatus[]>([
  ['A_VENIR', ['EN_COURS']],
  ['EN_COURS', ['SOUMIS', 'BLOQUE', 'EN_ALERTE', 'EN_RETARD']],
  ['SOUMIS', ['VALIDE', 'EN_COURS', 'EN_ALERTE', 'EN_RETARD']],
  ['EN_ALERTE', ['EN_RETARD']],
  // BLOQUE peut recevoir un override mais pas de transition ordinaire
  // EN_RETARD : pas de transition ordinaire (override uniquement)
]);

/** États depuis lesquels aucune transition ordinaire n'est possible. */
const TERMINAL_STATES: ReadonlySet<ProgressionStatus> = new Set([
  'VALIDE',
  'VALIDE_OVERRIDE',
]);

// ─── Transition ───────────────────────────────────────────────────────────────

/**
 * Effectue une transition de statut sur une Progression.
 *
 * @param prisma  - Instance PrismaClient (passée pour permettre les transactions).
 * @param progressionId - ID de la progression à muter.
 * @param from    - Statut attendu (vérifié contre DB pour éviter les races).
 * @param to      - Statut cible.
 * @param reason  - Obligatoire pour les transitions vers VALIDE_OVERRIDE.
 * @param byUserId - Utilisateur déclencheur (pour audit log).
 *
 * @throws {InvalidTransitionError} si la transition n'est pas dans VALID_TRANSITIONS.
 * @throws {Error} si le statut DB courant diffère de `from` (race condition).
 */
export async function transition(
  prisma: PrismaClient,
  progressionId: string,
  from: ProgressionStatus,
  to: ProgressionStatus,
  reason?: string,
  byUserId?: string,
): Promise<Progression> {
  // 1. Vérifier que la transition vers VALIDE_OVERRIDE a une raison
  if (to === 'VALIDE_OVERRIDE' && (!reason || reason.trim() === '')) {
    throw new InvalidTransitionError(from, to);
  }

  // 2. Vérifier la validité de la transition
  if (to === 'VALIDE_OVERRIDE') {
    // Override autorisé depuis n'importe quel état NON-terminal
    if (TERMINAL_STATES.has(from)) {
      throw new InvalidTransitionError(from, to);
    }
  } else {
    // Transition ordinaire : vérifier la matrice
    const allowed = VALID_TRANSITIONS.get(from);
    if (!allowed || !allowed.includes(to)) {
      logger.warn(
        { progressionId, from, to, byUserId },
        'progression.transition.invalid',
      );
      throw new InvalidTransitionError(from, to);
    }
  }

  // 3. Appliquer la mutation en transaction avec vérification du statut courant
  const updated = await prisma.$transaction(async (tx) => {
    // Lire l'état courant avec un lock optimiste (re-vérification)
    const current = await tx.progression.findUnique({
      where: { id: progressionId },
      select: { id: true, status: true },
    });

    if (!current) {
      throw new Error(`Progression introuvable : ${progressionId}`);
    }

    if (current.status !== from) {
      throw new Error(
        `Race condition : statut attendu "${from}", statut actuel "${current.status}"`,
      );
    }

    // Champs supplémentaires selon la cible
    const extra: Partial<{
      submittedAt: Date;
      validatedAt: Date;
      overrideBy: string;
      overrideReason: string;
    }> = {};

    if (to === 'SOUMIS') {
      extra.submittedAt = new Date();
    }
    if (to === 'VALIDE' || to === 'VALIDE_OVERRIDE') {
      extra.validatedAt = new Date();
    }
    if (to === 'VALIDE_OVERRIDE') {
      if (byUserId) { extra.overrideBy = byUserId; }
      if (reason) { extra.overrideReason = reason.trim(); }
    }

    const result = await tx.progression.update({
      where: { id: progressionId },
      data: {
        status: to,
        ...extra,
      },
    });

    logger.info(
      { progressionId, from, to, byUserId },
      'progression.transitioned',
    );

    return result;
  });

  return updated;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Vérifie si un statut est terminal (aucune transition possible). */
export function isTerminal(status: ProgressionStatus): boolean {
  return TERMINAL_STATES.has(status);
}

/** Retourne les transitions disponibles depuis un statut (liste vide si terminal). */
export function availableTransitions(status: ProgressionStatus): ProgressionStatus[] {
  if (TERMINAL_STATES.has(status)) { return []; }
  return VALID_TRANSITIONS.get(status) ?? [];
}
