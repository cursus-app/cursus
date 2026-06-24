// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvedAlert, sendSlackAlert } from '~~/server/utils/alerts';
import { env } from '~~/server/utils/env';
import { logger } from '~~/server/utils/logger';

vi.mock('~~/server/utils/env', () => ({
  env: {
    SLACK_WEBHOOK_URL: undefined,
    ALERT_EMAIL: undefined,
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const fetchMock = vi.fn();

describe('server/utils/alerts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('sendSlackAlert', () => {
    it('loggue alerte sans webhook (skip Slack)', async () => {
      (env as { SLACK_WEBHOOK_URL?: string }).SLACK_WEBHOOK_URL = undefined;
      await sendSlackAlert({ name: 'test', severity: 'warning', message: 'test msg' });

      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'alert.triggered', alert_name: 'test' }),
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('envoie la requête Slack si webhook configuré', async () => {
      (env as { SLACK_WEBHOOK_URL?: string }).SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

      await sendSlackAlert({
        name: 'harness_latency',
        severity: 'warning',
        message: 'Latence élevée',
        currentValue: '450s',
        threshold: '420s',
        runbookUrl: 'https://example.com/runbook',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'alert.slack_sent' }),
      );
    });

    it('loggue erreur si Slack répond non-ok', async () => {
      (env as { SLACK_WEBHOOK_URL?: string }).SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });

      await sendSlackAlert({ name: 'test', severity: 'critical', message: 'msg' });

      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'alert.slack_error', status: 503 }),
      );
    });

    it('ne contient pas de PII dans le payload Slack', async () => {
      (env as { SLACK_WEBHOOK_URL?: string }).SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

      await sendSlackAlert({
        name: 'auth_failure',
        severity: 'critical',
        message: 'Taux auth élevé: 25%',
        currentValue: '25%',
      });

      const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
      const payload = JSON.stringify(body);
      expect(payload).not.toMatch(/@[a-z0-9.]+\.[a-z]{2,}/i);
    });

    it('inclut le bouton runbook si runbookUrl fourni', async () => {
      (env as { SLACK_WEBHOOK_URL?: string }).SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

      await sendSlackAlert({
        name: 'test',
        severity: 'info',
        message: 'test',
        runbookUrl: 'https://github.com/cursus-app/cursus/blob/main/docs/runbooks/test.md',
      });

      const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
      const hasAction = body.blocks.some(
        (b: { type: string; elements?: Array<{ url?: string }> }) =>
          b.type === 'actions' && b.elements?.some((e) => e.url?.includes('runbooks')),
      );
      expect(hasAction).toBe(true);
    });
  });

  describe('resolvedAlert', () => {
    it('loggue la résolution', () => {
      resolvedAlert('alerts.harness.latency');
      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'alert.resolved', alert_name: 'alerts.harness.latency' }),
      );
    });
  });
});
