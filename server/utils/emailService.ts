/**
 * emailService — envoi d'emails transactionnels via Resend.
 *
 * Toutes les méthodes sont async et lèvent une EmailServiceError en cas
 * d'échec API. Les erreurs "Resend down" sont propagées pour retry en queue.
 *
 * Cf. ST-12.2, TT-12.2.3 — service email.ts avec types stricts.
 */

import { getEnv } from '~~/server/utils/env';
import { logger } from '~~/server/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailSendResult {
  id: string;
  success: boolean;
}

export interface HarnessCheck {
  name: string;
  passed: boolean;
  message?: string;
}

// ─── Erreur métier ─────────────────────────────────────────────────────────────

export class EmailServiceError extends Error {
  // `cause` existe déjà dans Error (ES2022) — on utilise override pour TS strict.
  public override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'EmailServiceError';
    this.cause = cause;
  }
}

// ─── Client Resend (injection-friendly pour les tests) ──────────────────────

interface ResendPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ResendResponse {
  id?: string;
  error?: { message: string };
}

/**
 * Appelle l'API Resend pour envoyer un email.
 * Abstrait en fonction séparée pour faciliter le mock en tests.
 */
export async function sendViaResend(
  payload: ResendPayload,
  apiKey?: string,
): Promise<EmailSendResult> {
  const env = getEnv();
  const key = apiKey ?? env.RESEND_API_KEY;

  if (!key) {
    logger.warn({ to: '[REDACTED]' }, 'email.skipped.no_api_key');
    return { id: 'skipped', success: false };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as ResendResponse;

  if (!response.ok || body.error) {
    const message = body.error?.message ?? `HTTP ${String(response.status)}`;
    logger.error({ status: response.status }, 'email.send_failed');
    throw new EmailServiceError(`Resend API error: ${message}`);
  }

  logger.info({ emailId: body.id }, 'email.sent');
  return { id: body.id ?? 'unknown', success: true };
}

// ─── From address ─────────────────────────────────────────────────────────────

function getFrom(): string {
  const env = getEnv();
  return env.RESEND_FROM_EMAIL ?? 'noreply@cursus.app';
}

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

function wrapHtml(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cursus</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <!-- Preheader (hors écran) -->
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>` : ''}

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <!-- Logo -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#4f46e5;">Cursus</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:40px;border:1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;font-size:12px;color:#6b7280;">
              <p style="margin:0 0 8px 0;">© ${new Date().getFullYear()} Cursus. Tous droits réservés.</p>
              <p style="margin:0;">Tu reçois cet email car tu es membre de la plateforme Cursus.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function plainText(content: string): string {
  // Retirer les balises HTML et nettoyer
  return content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * Email de bienvenue envoyé à la création de compte.
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<EmailSendResult> {
  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">Bienvenue sur Cursus, ${name} !</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      Ton compte est prêt. Tu peux dès maintenant accéder à tes cursus, soumettre tes livrables
      et suivre ta progression semaine après semaine.
    </p>
    <p style="margin:0 0 24px 0;font-size:16px;color:#374151;line-height:1.6;">
      Le harnais de validation automatique vérifiera chacun de tes livrables et te donnera
      un retour immédiat sur la qualité de ton travail.
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="background-color:#4f46e5;border-radius:8px;padding:12px 24px;">
          <a href="https://cursus.app/dashboard" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
            Accéder à mon espace →
          </a>
        </td>
      </tr>
    </table>
  `;

  return sendViaResend({
    from: getFrom(),
    to,
    subject: `Bienvenue sur Cursus, ${name} !`,
    html: wrapHtml(content, `Ton compte Cursus est prêt — accède à tes cursus`),
    text: plainText(content),
  });
}

/**
 * Rappel de fin de semaine pour un module.
 */
export async function sendWeekReminderEmail(
  to: string,
  name: string,
  weekTitle: string,
  dueDate: Date,
): Promise<EmailSendResult> {
  const dueDateStr = dueDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">Rappel : livrable à soumettre</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      Bonjour ${name},
    </p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      Le module <strong>${weekTitle}</strong> arrive à échéance le <strong>${dueDateStr}</strong>.
      Pense à soumettre ton livrable avant la date limite pour que le harnais puisse l'évaluer.
    </p>
    <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:16px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#92400e;">
        <strong>Délai restant :</strong> soumets ton travail avant le ${dueDateStr}.
      </p>
    </div>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="background-color:#4f46e5;border-radius:8px;padding:12px 24px;">
          <a href="https://cursus.app/dashboard" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
            Soumettre mon livrable →
          </a>
        </td>
      </tr>
    </table>
  `;

  return sendViaResend({
    from: getFrom(),
    to,
    subject: `Rappel : livrable "${weekTitle}" à soumettre`,
    html: wrapHtml(content, `Délai : ${dueDateStr} — ne rate pas la date limite`),
    text: plainText(content),
  });
}

/**
 * Alerte formateur — un stagiaire est en difficulté.
 */
export async function sendAlertEmail(
  to: string,
  name: string,
  moduleName: string,
  daysLate: number,
): Promise<EmailSendResult> {
  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">Alerte : stagiaire en difficulté</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      Bonjour ${name},
    </p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      Un de tes stagiaires n'a pas encore soumis son livrable pour le module
      <strong>${moduleName}</strong>, qui est en retard de <strong>${daysLate} jour${daysLate > 1 ? 's' : ''}</strong>.
    </p>
    <div style="background-color:#fee2e2;border-left:4px solid #ef4444;border-radius:4px;padding:16px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#991b1b;">
        <strong>Action recommandée :</strong> prends contact avec ce stagiaire pour l'aider à débloquer sa situation.
      </p>
    </div>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="background-color:#4f46e5;border-radius:8px;padding:12px 24px;">
          <a href="https://cursus.app/dashboard" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
            Voir les alertes →
          </a>
        </td>
      </tr>
    </table>
  `;

  return sendViaResend({
    from: getFrom(),
    to,
    subject: `Alerte : stagiaire en retard sur "${moduleName}"`,
    html: wrapHtml(content, `Un stagiaire est en retard de ${daysLate}j sur ${moduleName}`),
    text: plainText(content),
  });
}

/**
 * Résultat de validation du harnais.
 */
export async function sendHarnessResultEmail(
  to: string,
  name: string,
  score: number,
  checks: HarnessCheck[],
): Promise<EmailSendResult> {
  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  const isPassing = score >= 80;

  const statusColor = isPassing ? '#059669' : '#dc2626';
  const statusBg = isPassing ? '#d1fae5' : '#fee2e2';
  const statusText = isPassing ? 'Livrable validé !' : 'Des corrections sont nécessaires';

  const checksHtml = checks
    .map((c) => {
      const icon = c.passed ? '✅' : '❌';
      return `<li style="margin:8px 0;font-size:14px;color:#374151;">${icon} ${c.name}${c.message ? ` — ${c.message}` : ''}</li>`;
    })
    .join('');

  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">Résultat du harnais</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      Bonjour ${name},
    </p>
    <div style="background-color:${statusBg};border-left:4px solid ${statusColor};border-radius:4px;padding:16px;margin:0 0 24px 0;text-align:center;">
      <p style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:${statusColor};">
        Score : ${String(score)}/100
      </p>
      <p style="margin:0;font-size:16px;color:${statusColor};">${statusText}</p>
    </div>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">
      <strong>${String(passed)}/${String(total)}</strong> vérifications passées :
    </p>
    <ul style="margin:0 0 24px 0;padding-left:24px;">
      ${checksHtml}
    </ul>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="background-color:#4f46e5;border-radius:8px;padding:12px 24px;">
          <a href="https://cursus.app/dashboard" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
            Voir le détail →
          </a>
        </td>
      </tr>
    </table>
  `;

  const subject = isPassing
    ? `Livrable validé — score ${String(score)}/100`
    : `Action requise — score ${String(score)}/100 — ${String(total - passed)} vérification${total - passed > 1 ? 's' : ''} en échec`;

  return sendViaResend({
    from: getFrom(),
    to,
    subject,
    html: wrapHtml(content, `Score ${String(score)}/100 — ${String(passed)}/${String(total)} vérifications`),
    text: plainText(content),
  });
}

/**
 * Email d'invitation à rejoindre une cohorte.
 */
export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  cohorteName: string,
  inviteUrl: string,
): Promise<EmailSendResult> {
  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">Tu es invité sur Cursus</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      <strong>${inviterName}</strong> t'invite à rejoindre la cohorte <strong>${cohorteName}</strong> sur Cursus.
    </p>
    <p style="margin:0 0 24px 0;font-size:16px;color:#374151;line-height:1.6;">
      Cursus est une plateforme de suivi de stage qui te permet de soumettre tes livrables,
      les faire valider automatiquement, et suivre ta progression semaine après semaine.
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="background-color:#4f46e5;border-radius:8px;padding:12px 24px;">
          <a href="${inviteUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
            Accepter l'invitation →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0 0;font-size:12px;color:#6b7280;text-align:center;">
      Ce lien expire dans 7 jours. Si tu n'as pas demandé cette invitation, ignore cet email.
    </p>
  `;

  return sendViaResend({
    from: getFrom(),
    to,
    subject: `${inviterName} t'invite à rejoindre ${cohorteName} sur Cursus`,
    html: wrapHtml(content, `Invitation de ${inviterName} pour rejoindre ${cohorteName}`),
    text: plainText(content),
  });
}
