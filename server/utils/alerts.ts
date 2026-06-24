import { logger } from '~~/server/utils/logger';
import { env } from '~~/server/utils/env';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertPayload {
  name: string;
  severity: AlertSeverity;
  message: string;
  currentValue?: number | string;
  threshold?: number | string;
  runbookUrl?: string;
}

export async function sendSlackAlert(alert: AlertPayload): Promise<void> {
  const webhookUrl = env.SLACK_WEBHOOK_URL;

  logger.warn({
    event: 'alert.triggered',
    alert_name: alert.name,
    severity: alert.severity,
    current_value: alert.currentValue,
    threshold: alert.threshold,
  });

  if (!webhookUrl) {
    logger.warn({ event: 'alert.slack_skip', reason: 'SLACK_WEBHOOK_URL not configured' });
    return;
  }

  const severityEmoji: Record<AlertSeverity, string> = {
    critical: ':red_circle:',
    warning: ':large_yellow_circle:',
    info: ':large_blue_circle:',
  };

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${severityEmoji[alert.severity]} ${alert.name}`,
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: alert.message },
    },
    ...(alert.currentValue !== undefined || alert.threshold !== undefined
      ? [
          {
            type: 'section',
            fields: [
              ...(alert.currentValue !== undefined
                ? [{ type: 'mrkdwn', text: `*Valeur actuelle:*\n${alert.currentValue}` }]
                : []),
              ...(alert.threshold !== undefined
                ? [{ type: 'mrkdwn', text: `*Seuil:*\n${alert.threshold}` }]
                : []),
            ],
          },
        ]
      : []),
    ...(alert.runbookUrl
      ? [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Ouvrir le runbook' },
                url: alert.runbookUrl,
              },
            ],
          },
        ]
      : []),
  ];

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });

    if (!res.ok) {
      logger.error({ event: 'alert.slack_error', status: res.status });
    } else {
      logger.info({ event: 'alert.slack_sent', alert_name: alert.name });
    }
  } catch (err) {
    logger.error({ event: 'alert.slack_error', err });
  }
}

export function resolvedAlert(name: string): void {
  logger.info({ event: 'alert.resolved', alert_name: name });
}
