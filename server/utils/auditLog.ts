/**
 * Utilitaire centralisé pour créer des entrées d'audit log.
 *
 * Toutes les actions sensibles de l'application passent par `createAuditEntry`.
 * Les entrées sont immuables (RLS deny UPDATE/DELETE sur la table audit_logs).
 *
 * PII : les emails sont toujours hashés avant stockage. Les mots de passe ne
 * sont jamais stockés.
 *
 * Ref : ST-08.4 — TT-08.4.2
 */
import { Prisma } from '@prisma/client';
import type { H3Event } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { logger } from '~~/server/utils/logger';
import { hashId } from '~~/server/utils/hash';

export type AuditAction =
  // Auth
  | 'auth.login_failed'
  | 'auth.2fa_disabled'
  // Utilisateurs
  | 'user.created'
  | 'user.disabled'
  | 'user.deleted'
  | 'user.role_changed'
  // Cursus / Modules
  | 'cursus.created'
  | 'cursus.updated'
  | 'cursus.deleted'
  | 'module.created'
  | 'module.updated'
  | 'module.deleted'
  // Cohortes
  | 'cohorte.created'
  | 'cohorte.updated'
  | 'cohorte.deleted'
  | 'cohorte.schedule_shifted'
  // Livrables / Harnais
  | 'submission.override.validate'
  | 'submission.override.extend'
  | 'harness.triggered'
  // Certificats
  | 'certificate.issued'
  // Badges
  | 'badge.grant.manual'
  // GDPR
  | 'gdpr.export_requested'
  | 'gdpr.deletion_requested'
  | 'gdpr.account_anonymized';

export interface AuditEntryInput {
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  diff?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Crée une entrée d'audit log de façon asynchrone non-bloquante.
 * Les erreurs sont loguées mais ne propagent pas pour ne pas casser le flux principal.
 */
export async function createAuditEntry(input: AuditEntryInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        diff:
          input.diff !== null && input.diff !== undefined
            ? (input.diff as Prisma.InputJsonValue)
            : Prisma.DbNull,
        metadata:
          input.metadata !== null && input.metadata !== undefined
            ? (input.metadata as Prisma.InputJsonValue)
            : Prisma.DbNull,
        ipAddress: input.ipAddress ? maskIp(input.ipAddress) : null,
        userAgent: input.userAgent ?? null,
      },
    });

    logger.info(
      {
        action: input.action,
        entityType: input.entityType,
        entityIdHash: input.entityId ? hashId(input.entityId) : null,
        actorIdHash: input.actorId ? hashId(input.actorId) : null,
      },
      'audit.entry_created',
    );
  } catch (err) {
    logger.error({ err, action: input.action }, 'audit.entry_create_failed');
  }
}

/**
 * Retire les valeurs PII potentielles d'un objet diff avant stockage.
 * Hash les emails, supprime les champs password/token/secret.
 */
export function sanitizeDiff(obj: Record<string, unknown>): Record<string, unknown> {
  const REDACTED_KEYS = new Set(['password', 'token', 'secret', 'accessToken', 'refreshToken']);
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (key === 'email' && typeof value === 'string') {
      result[key] = hashId(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeDiff(item as Record<string, unknown>)
          : item,
      );
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeDiff(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Pseudonymise l'IP après 30j — ici on masque le dernier octet (IPv4)
 * ou les 4 derniers groupes (IPv6) dès l'insertion.
 * Gère la notation compressée IPv6 (ex: ::1, 2001:db8::1).
 */
export function maskIp(ip: string): string {
  const ipv4 = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (ipv4?.[1]) {
    return `${ipv4[1]}.0`;
  }
  if (ip.includes(':')) {
    const expanded = expandIPv6(ip);
    const parts = expanded.split(':');
    if (parts.length === 8) {
      return [...parts.slice(0, 4), '0', '0', '0', '0'].join(':');
    }
  }
  return ip;
}

function expandIPv6(ip: string): string {
  const halves = ip.split('::');
  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    return [...left, ...Array<string>(missing).fill('0'), ...right].join(':');
  }
  return ip;
}

/**
 * Extrait l'IP de l'en-tête X-Forwarded-For ou de l'adresse distante.
 * À appeler dans les event handlers Nitro.
 */
export function extractIp(event: H3Event): string | null {
  const forwarded = event.node.req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? null;
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]?.trim() ?? null;
  }
  return event.node.req.socket?.remoteAddress ?? null;
}
