// Utilitaires de hachage pour la conformité RGPD.
// Règle : ne jamais logger d'identifiants personnels en clair — toujours hasher.
// SHA-256 tronqué à 16 chars suffit pour la corrélation de logs sans exposer de PII.
import { createHash } from 'node:crypto';

/**
 * Hash SHA-256 d'un userId (UUID) tronqué à 16 caractères hex.
 * Usage : `logger.info({ uid: hashId(userId) }, 'gdpr.export.requested')`
 */
export function hashId(id: string): string {
  return createHash('sha256').update(id).digest('hex').slice(0, 16);
}

/**
 * Hash SHA-256 d'un email tronqué à 16 caractères hex.
 * Usage : `logger.info({ emailHash: hashEmail(email) }, 'user.login')`
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 16);
}

/**
 * Génère un pseudonyme UUID stable et déterministe à partir d'un userId et
 * d'un secret applicatif. Utilisé pour anonymiser l'audit log après suppression.
 *
 * Le résultat est reproductible (même input → même output) mais non réversible
 * sans le secret. Cf. ST-15.2 TT-15.2.5.
 *
 * Format de sortie : UUID v4 synthétique (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 */
export function stablePseudoId(userId: string, secret: string): string {
  const raw = createHash('sha256').update(`${secret}:${userId}`).digest('hex');
  // Reformater les 32 premiers hex en UUID v4 (bits de version/variante forcés)
  const p1 = raw.slice(0, 8);
  const p2 = raw.slice(8, 12);
  const p3 = `4${raw.slice(13, 16)}`; // version 4
  // raw est un hash hex de 64 chars — l'index 16 existe toujours.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const p4 = `${((parseInt(raw[16]!, 16) & 0x3) | 0x8).toString(16)}${raw.slice(17, 20)}`; // variante
  const p5 = raw.slice(20, 32);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}
