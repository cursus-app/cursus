/**
 * Service d'envoi d'emails transactionnels.
 * ST-12.x connectera Resend ici — pour l'instant : stub dev / warning prod.
 *
 * Interface stable : les appelants ne changent pas quand Resend est branché.
 */
import { createHash } from 'node:crypto';
import { logger } from '~~/server/utils/logger';

export interface InvitationEmailContext {
  senderName: string;
  cohorteName: string;
  /** Valeur de l'enum UserRole : STAGIAIRE | CO_FORMATEUR */
  role: string;
  expiresInDays: number;
}

/**
 * Envoie un email d'invitation.
 *
 * - En développement : logge le lien complet (utile pour tester sans boîte mail).
 * - En production sans Resend configuré : warning + invitation DB créée quand même.
 * - ST-12.x : Resend branché ici, même signature.
 */
export async function sendInvitationEmail(
  to: string,
  invitationLink: string,
  context: InvitationEmailContext,
): Promise<void> {
  // Hash partiel de l'email pour les logs (PII — cf. 09-engineering-playbook §5.4).
  const emailHash = createHash('sha256').update(to).digest('hex').slice(0, 8);

  if (process.env['NODE_ENV'] !== 'production') {
    // En dev : lien complet dans les logs (utile pour tests manuels).
    logger.info(
      {
        emailHash,
        invitationLink, // OK en dev uniquement
        cohorteName: context.cohorteName,
        role: context.role,
        expiresInDays: context.expiresInDays,
      },
      'email.invitation.dev_stub',
    );
    return;
  }

  // TODO ST-12.x — brancher Resend ici.
  // L'invitation est créée en DB même si l'email n'est pas envoyé.
  logger.warn(
    { emailHash },
    'email.invitation.not_sent — Resend non configuré (ST-12.x pending)',
  );
}
