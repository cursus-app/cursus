// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { pino } from 'pino';
import { REDACT_PATHS, childLogger, logger } from '~~/server/utils/logger';

// Le `logger` exporté est désactivé sous test (`enabled: !isTest`). Pour valider
// la redaction PII, on reconstruit un pino avec les MÊMES paths sur un flux capturé.
function captureWith(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  const stream = { write: (s: string) => void lines.push(s) };
  const testLogger = pino(
    { base: null, redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } },
    stream,
  );
  testLogger.info(obj, 'msg');
  return lines.join('');
}

describe('server/utils/logger', () => {
  it('redacte la PII au top-level (cas childLogger({ email }))', () => {
    const out = captureWith({ email: 'top@example.com', password: 'p@ss' });
    expect(out).toContain('[REDACTED]');
    expect(out).not.toContain('top@example.com');
    expect(out).not.toContain('p@ss');
  });

  it('redacte la PII imbriquée à un niveau (user.email, user.token)', () => {
    const out = captureWith({ user: { email: 'a@b.com', token: 'secret-token' } });
    expect(out).not.toContain('a@b.com');
    expect(out).not.toContain('secret-token');
  });

  it('redacte authorization/cookie au top-level', () => {
    const out = captureWith({ authorization: 'Bearer xyz', cookie: 'sid=abc' });
    expect(out).not.toContain('Bearer xyz');
    expect(out).not.toContain('sid=abc');
  });

  it('childLogger renvoie un logger enfant avec les méthodes attendues', () => {
    const child = childLogger({ requestId: 'r1', userId: 'u1' });
    expect(typeof child.info).toBe('function');
    expect(typeof child.warn).toBe('function');
    expect(typeof child.error).toBe('function');
  });

  it('le logger exporté est un logger pino valide', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
