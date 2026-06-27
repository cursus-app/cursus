/**
 * emailService — envoi d'emails transactionnels via Resend.
 *
 * Toutes les méthodes sont async et lèvent une EmailServiceError en cas
 * d'échec API. Les erreurs "Resend down" sont propagées pour retry en queue.
 *
 * La locale du destinataire (optionnelle, défaut 'fr') permet de localiser
 * les sujets et corps des emails. Elle est passée explicitement plutôt que
 * lue depuis event.context pour permettre l'appel depuis les jobs Inngest
 * qui n'ont pas de contexte HTTP.
 *
 * Cf. ST-12.2, TT-12.2.3, ST-19.4 / TT-19.4.2
 */

import { getEnv } from '~~/server/utils/env';
import { logger } from '~~/server/utils/logger';
import { tServer } from '~~/server/utils/i18n';
import type { SupportedLocale } from '~~/shared/types/locale';

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

/** Escape HTML special chars to prevent XSS when interpolating into HTML templates. */
function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Validate that a URL uses https: protocol before embedding in HTML. */
function safeHttpsUrl(raw: string): string {
  const parsed = new URL(raw);
  if (parsed.protocol !== 'https:') {
    throw new EmailServiceError(`Invalid invite URL scheme: ${parsed.protocol}`);
  }
  return escHtml(parsed.toString());
}

function wrapHtml(content: string, preheader = '', locale: SupportedLocale = 'fr'): string {
  const footerCopyright =
    locale === 'en'
      ? `© ${new Date().getFullYear()} Cursus. All rights reserved.`
      : `© ${new Date().getFullYear()} Cursus. Tous droits réservés.`;
  const footerMember =
    locale === 'en'
      ? 'You received this email because you are a member of the Cursus platform.'
      : 'Tu reçois cet email car tu es membre de la plateforme Cursus.';

  return `<!DOCTYPE html>
<html lang="${locale}">
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
              <p style="margin:0 0 8px 0;">${footerCopyright}</p>
              <p style="margin:0;">${footerMember}</p>
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
  return content
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * Email de bienvenue envoyé à la création de compte.
 * @param locale - Locale du destinataire ('fr' | 'en'). Défaut : 'fr'.
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  locale: SupportedLocale = 'fr',
): Promise<EmailSendResult> {
  const safeName = escHtml(name);

  const heading =
    locale === 'en' ? `Welcome to Cursus, ${safeName}!` : `Bienvenue sur Cursus, ${safeName} !`;
  const body1 =
    locale === 'en'
      ? 'Your account is ready. You can now access your courses, submit your deliverables and track your progress week after week.'
      : 'Ton compte est prêt. Tu peux dès maintenant accéder à tes cursus, soumettre tes livrables et suivre ta progression semaine après semaine.';
  const body2 =
    locale === 'en'
      ? 'The automatic validation harness will check each of your deliverables and give you immediate feedback on the quality of your work.'
      : 'Le harnais de validation automatique vérifiera chacun de tes livrables et te donnera un retour immédiat sur la qualité de ton travail.';
  const cta = locale === 'en' ? 'Access my workspace →' : 'Accéder à mon espace →';
  const preheader =
    locale === 'en'
      ? 'Your Cursus account is ready — access your courses'
      : 'Ton compte Cursus est prêt — accède à tes cursus';
  const subject =
    locale === 'en' ? `Welcome to Cursus, ${name}!` : `Bienvenue sur Cursus, ${name} !`;

  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">${heading}</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      ${body1}
    </p>
    <p style="margin:0 0 24px 0;font-size:16px;color:#374151;line-height:1.6;">
      ${body2}
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="background-color:#4f46e5;border-radius:8px;padding:12px 24px;">
          <a href="https://cursus.app/dashboard" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
            ${cta}
          </a>
        </td>
      </tr>
    </table>
  `;

  logger.info({ surface: 'email', locale, template: 'welcome' }, 'i18n.server.render');

  return sendViaResend({
    from: getFrom(),
    to,
    subject,
    html: wrapHtml(content, preheader, locale),
    text: plainText(content),
  });
}

/**
 * Rappel de fin de semaine pour un module.
 * @param locale - Locale du destinataire ('fr' | 'en'). Défaut : 'fr'.
 */
export async function sendWeekReminderEmail(
  to: string,
  name: string,
  weekTitle: string,
  dueDate: Date,
  locale: SupportedLocale = 'fr',
): Promise<EmailSendResult> {
  const intlLocale = locale === 'en' ? 'en-US' : 'fr-FR';
  const dueDateStr = dueDate.toLocaleDateString(intlLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const safeName = escHtml(name);
  const safeWeekTitle = escHtml(weekTitle);

  const heading = tServer(locale, 'email.subject.weekReminder');
  const cta = locale === 'en' ? 'Submit my deliverable →' : 'Soumettre mon livrable →';
  const deadlineLabel =
    locale === 'en' ? '<strong>Remaining time:</strong>' : '<strong>Délai restant :</strong>';
  const deadlineText =
    locale === 'en'
      ? `submit your work before ${dueDateStr}.`
      : `soumets ton travail avant le ${dueDateStr}.`;
  const body1 =
    locale === 'en'
      ? `The module <strong>${safeWeekTitle}</strong> is due on <strong>${dueDateStr}</strong>. Remember to submit your deliverable before the deadline so the harness can evaluate it.`
      : `Le module <strong>${safeWeekTitle}</strong> arrive à échéance le <strong>${dueDateStr}</strong>. Pense à soumettre ton livrable avant la date limite pour que le harnais puisse l'évaluer.`;
  const preheader =
    locale === 'en'
      ? `Deadline: ${dueDateStr} — don't miss the deadline`
      : `Délai : ${dueDateStr} — ne rate pas la date limite`;

  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">${heading}</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      ${locale === 'en' ? 'Hello' : 'Bonjour'} ${safeName},
    </p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      ${body1}
    </p>
    <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:16px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#92400e;">
        ${deadlineLabel} ${deadlineText}
      </p>
    </div>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="background-color:#4f46e5;border-radius:8px;padding:12px 24px;">
          <a href="https://cursus.app/dashboard" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
            ${cta}
          </a>
        </td>
      </tr>
    </table>
  `;

  const subject =
    locale === 'en'
      ? `Reminder: deliverable "${weekTitle}" to submit`
      : `Rappel : livrable "${weekTitle}" à soumettre`;

  logger.info({ surface: 'email', locale, template: 'week-reminder' }, 'i18n.server.render');

  return sendViaResend({
    from: getFrom(),
    to,
    subject,
    html: wrapHtml(content, preheader, locale),
    text: plainText(content),
  });
}

/**
 * Alerte formateur — un stagiaire est en difficulté.
 * @param locale - Locale du destinataire ('fr' | 'en'). Défaut : 'fr'.
 */
export async function sendAlertEmail(
  to: string,
  name: string,
  moduleName: string,
  daysLate: number,
  locale: SupportedLocale = 'fr',
): Promise<EmailSendResult> {
  const safeName = escHtml(name);
  const safeModuleName = escHtml(moduleName);

  const dayUnit =
    locale === 'en'
      ? `${daysLate} day${daysLate > 1 ? 's' : ''}`
      : `${daysLate} jour${daysLate > 1 ? 's' : ''}`;

  const heading =
    locale === 'en' ? 'Alert: intern in difficulty' : 'Alerte : stagiaire en difficulté';
  const body1 =
    locale === 'en'
      ? `One of your interns has not yet submitted their deliverable for the module <strong>${safeModuleName}</strong>, which is <strong>${dayUnit}</strong> late.`
      : `Un de tes stagiaires n'a pas encore soumis son livrable pour le module <strong>${safeModuleName}</strong>, qui est en retard de <strong>${dayUnit}</strong>.`;
  const recommendation =
    locale === 'en'
      ? '<strong>Recommended action:</strong> contact this intern to help them unblock their situation.'
      : "<strong>Action recommandée :</strong> prends contact avec ce stagiaire pour l'aider à débloquer sa situation.";
  const cta = locale === 'en' ? 'View alerts →' : 'Voir les alertes →';
  const preheader =
    locale === 'en'
      ? `An intern is ${dayUnit} late on ${safeModuleName}`
      : `Un stagiaire est en retard de ${daysLate}j sur ${safeModuleName}`;
  const subject =
    locale === 'en'
      ? `Alert: intern late on "${moduleName}"`
      : `Alerte : stagiaire en retard sur "${moduleName}"`;

  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">${heading}</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      ${locale === 'en' ? 'Hello' : 'Bonjour'} ${safeName},
    </p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      ${body1}
    </p>
    <div style="background-color:#fee2e2;border-left:4px solid #ef4444;border-radius:4px;padding:16px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#991b1b;">
        ${recommendation}
      </p>
    </div>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="background-color:#4f46e5;border-radius:8px;padding:12px 24px;">
          <a href="https://cursus.app/dashboard" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
            ${cta}
          </a>
        </td>
      </tr>
    </table>
  `;

  logger.info({ surface: 'email', locale, template: 'alert' }, 'i18n.server.render');

  return sendViaResend({
    from: getFrom(),
    to,
    subject,
    html: wrapHtml(content, preheader, locale),
    text: plainText(content),
  });
}

/**
 * Résultat de validation du harnais.
 * @param locale - Locale du destinataire ('fr' | 'en'). Défaut : 'fr'.
 */
export async function sendHarnessResultEmail(
  to: string,
  name: string,
  score: number,
  checks: HarnessCheck[],
  locale: SupportedLocale = 'fr',
): Promise<EmailSendResult> {
  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;
  const isPassing = score >= 80;

  const statusColor = isPassing ? '#059669' : '#dc2626';
  const statusBg = isPassing ? '#d1fae5' : '#fee2e2';
  const statusText =
    locale === 'en'
      ? isPassing
        ? 'Deliverable validated!'
        : 'Corrections needed'
      : isPassing
        ? 'Livrable validé !'
        : 'Des corrections sont nécessaires';

  const safeName = escHtml(name);
  const checksHtml = checks
    .map((c) => {
      const icon = c.passed ? '✅' : '❌';
      return `<li style="margin:8px 0;font-size:14px;color:#374151;">${icon} ${escHtml(c.name)}${c.message ? ` — ${escHtml(c.message)}` : ''}</li>`;
    })
    .join('');

  const heading = locale === 'en' ? 'Harness result' : 'Résultat du harnais';
  const scoreLabel = locale === 'en' ? 'Score:' : 'Score :';
  const checksPassedLabel =
    locale === 'en'
      ? `<strong>${String(passed)}/${String(total)}</strong> checks passed:`
      : `<strong>${String(passed)}/${String(total)}</strong> vérifications passées :`;
  const cta = locale === 'en' ? 'View details →' : 'Voir le détail →';
  const preheader =
    locale === 'en'
      ? `Score ${String(score)}/100 — ${String(passed)}/${String(total)} checks`
      : `Score ${String(score)}/100 — ${String(passed)}/${String(total)} vérifications`;

  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">${heading}</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      ${locale === 'en' ? 'Hello' : 'Bonjour'} ${safeName},
    </p>
    <div style="background-color:${statusBg};border-left:4px solid ${statusColor};border-radius:4px;padding:16px;margin:0 0 24px 0;text-align:center;">
      <p style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:${statusColor};">
        ${scoreLabel} ${String(score)}/100
      </p>
      <p style="margin:0;font-size:16px;color:${statusColor};">${statusText}</p>
    </div>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;">
      ${checksPassedLabel}
    </p>
    <ul style="margin:0 0 24px 0;padding-left:24px;">
      ${checksHtml}
    </ul>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="background-color:#4f46e5;border-radius:8px;padding:12px 24px;">
          <a href="https://cursus.app/dashboard" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
            ${cta}
          </a>
        </td>
      </tr>
    </table>
  `;

  const failedCount = total - passed;
  const subject =
    locale === 'en'
      ? isPassing
        ? `Deliverable validated — score ${String(score)}/100`
        : `Action required — score ${String(score)}/100 — ${String(failedCount)} check${failedCount > 1 ? 's' : ''} failed`
      : isPassing
        ? `Livrable validé — score ${String(score)}/100`
        : `Action requise — score ${String(score)}/100 — ${String(failedCount)} vérification${failedCount > 1 ? 's' : ''} en échec`;

  logger.info({ surface: 'email', locale, template: 'harness-result' }, 'i18n.server.render');

  return sendViaResend({
    from: getFrom(),
    to,
    subject,
    html: wrapHtml(content, preheader, locale),
    text: plainText(content),
  });
}

/**
 * Email d'invitation à rejoindre une cohorte.
 * @param locale - Locale du destinataire ('fr' | 'en'). Défaut : 'fr'.
 */
export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  cohorteName: string,
  inviteUrl: string,
  locale: SupportedLocale = 'fr',
): Promise<EmailSendResult> {
  const safeInviterName = escHtml(inviterName);
  const safeCohorteName = escHtml(cohorteName);
  const safeInviteUrl = safeHttpsUrl(inviteUrl);

  const heading = locale === 'en' ? 'You are invited to Cursus' : 'Tu es invité sur Cursus';
  const body1 =
    locale === 'en'
      ? `<strong>${safeInviterName}</strong> invites you to join the cohort <strong>${safeCohorteName}</strong> on Cursus.`
      : `<strong>${safeInviterName}</strong> t'invite à rejoindre la cohorte <strong>${safeCohorteName}</strong> sur Cursus.`;
  const body2 =
    locale === 'en'
      ? 'Cursus is an internship tracking platform that lets you submit your deliverables, have them validated automatically, and track your progress week after week.'
      : 'Cursus est une plateforme de suivi de stage qui te permet de soumettre tes livrables, les faire valider automatiquement, et suivre ta progression semaine après semaine.';
  const cta = locale === 'en' ? 'Accept the invitation →' : "Accepter l'invitation →";
  const expiry =
    locale === 'en'
      ? "This link expires in 7 days. If you didn't request this invitation, ignore this email."
      : "Ce lien expire dans 7 jours. Si tu n'as pas demandé cette invitation, ignore cet email.";
  const preheader =
    locale === 'en'
      ? `Invitation from ${safeInviterName} to join ${safeCohorteName}`
      : `Invitation de ${safeInviterName} pour rejoindre ${safeCohorteName}`;
  const subject =
    locale === 'en'
      ? `${inviterName} invites you to join ${cohorteName} on Cursus`
      : `${inviterName} t'invite à rejoindre ${cohorteName} sur Cursus`;

  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">${heading}</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      ${body1}
    </p>
    <p style="margin:0 0 24px 0;font-size:16px;color:#374151;line-height:1.6;">
      ${body2}
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;">
      <tr>
        <td style="background-color:#4f46e5;border-radius:8px;padding:12px 24px;">
          <a href="${safeInviteUrl}" style="color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
            ${cta}
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0 0;font-size:12px;color:#6b7280;text-align:center;">
      ${expiry}
    </p>
  `;

  logger.info({ surface: 'email', locale, template: 'invitation' }, 'i18n.server.render');

  return sendViaResend({
    from: getFrom(),
    to,
    subject,
    html: wrapHtml(content, preheader, locale),
    text: plainText(content),
  });
}

/**
 * Alerte formateur — un stagiaire a signalé un blocage via le bouton "Je suis bloqué".
 */
export async function sendBlockedAlertEmail(
  to: string,
  formateurName: string,
  stagiaireName: string,
  moduleTitle: string,
  stagiairMessage: string,
): Promise<EmailSendResult> {
  const safeFormateurName = escHtml(formateurName);
  const safeStagiaireName = escHtml(stagiaireName);
  const safeModuleTitle = escHtml(moduleTitle);
  const safeMessage = escHtml(stagiairMessage);

  const content = `
    <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:700;color:#111827;">Stagiaire bloqué — action requise</h1>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      Bonjour ${safeFormateurName},
    </p>
    <p style="margin:0 0 16px 0;font-size:16px;color:#374151;line-height:1.6;">
      <strong>${safeStagiaireName}</strong> a signalé un blocage sur le module
      <strong>${safeModuleTitle}</strong> et a besoin de ton aide.
    </p>
    <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:16px;margin:24px 0;">
      <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#92400e;">Message du stagiaire :</p>
      <p style="margin:0;font-size:14px;color:#92400e;font-style:italic;">"${safeMessage}"</p>
    </div>
    <div style="background-color:#fee2e2;border-left:4px solid #ef4444;border-radius:4px;padding:16px;margin:0 0 24px 0;">
      <p style="margin:0;font-size:14px;color:#991b1b;">
        <strong>Action recommandée :</strong> contacte ${safeStagiaireName} pour l'aider à se débloquer.
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
    subject: `${stagiaireName} est bloqué sur "${moduleTitle}"`,
    html: wrapHtml(
      content,
      `${safeStagiaireName} a besoin d'aide sur ${safeModuleTitle}`,
    ),
    text: plainText(content),
  });
}
