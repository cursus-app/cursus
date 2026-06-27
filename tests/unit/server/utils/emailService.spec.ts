// @vitest-environment node
//
// Tests unitaires pour server/utils/emailService.ts (ST-12.2)
// Stratégie : mock fetch global + mock getEnv. On vérifie :
//   - le payload envoyé à Resend (from, to, subject, html, text)
//   - le comportement si RESEND_API_KEY absent (no-op)
//   - le throw EmailServiceError si Resend retourne une erreur
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mocks ----

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('~~/server/utils/env', () => ({
  getEnv: vi.fn().mockReturnValue({
    RESEND_API_KEY: 're_test_key_123',
    RESEND_FROM_EMAIL: 'test@cursus.app',
  }),
}));

// Logger est désactivé en test (enabled: !isTest dans logger.ts)
// mais on mocke quand même pour éviter les side-effects
vi.mock('~~/server/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ---- Helper ----

function resendOkResponse(id = 'email-id-123') {
  return {
    ok: true,
    status: 200,
    json: async () => ({ id }),
  };
}

function resendErrorResponse(message = 'Bad request', status = 400) {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message } }),
  };
}

// ---- Tests : sendViaResend ----

describe('sendViaResend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("envoie le payload correct à l'API Resend", async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendViaResend } = await import('~~/server/utils/emailService');

    const result = await sendViaResend({
      from: 'from@cursus.app',
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      text: 'Test',
    });

    expect(result).toEqual({ id: 'email-id-123', success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test_key_123',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('user@example.com'),
      }),
    );
  });

  it('retourne { success: false } si RESEND_API_KEY est absent', async () => {
    const { getEnv } = await import('~~/server/utils/env');
    vi.mocked(getEnv).mockReturnValueOnce({
      RESEND_API_KEY: undefined,
      RESEND_FROM_EMAIL: 'test@cursus.app',
    } as ReturnType<typeof getEnv>);

    const { sendViaResend } = await import('~~/server/utils/emailService');
    const result = await sendViaResend({
      from: 'from@cursus.app',
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result).toMatchObject({ success: false });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throw EmailServiceError si Resend retourne une erreur HTTP', async () => {
    mockFetch.mockResolvedValueOnce(resendErrorResponse('Quota exceeded', 429));
    const { sendViaResend, EmailServiceError } = await import('~~/server/utils/emailService');

    await expect(
      sendViaResend({
        from: 'from@cursus.app',
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      }),
    ).rejects.toBeInstanceOf(EmailServiceError);
  });

  it('throw EmailServiceError si Resend retourne { error: { message } } même en HTTP 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ error: { message: 'Validation error' } }),
    });
    const { sendViaResend, EmailServiceError } = await import('~~/server/utils/emailService');

    await expect(
      sendViaResend({
        from: 'from@cursus.app',
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      }),
    ).rejects.toBeInstanceOf(EmailServiceError);
  });
});

// ---- Tests : sendWelcomeEmail ----

describe('sendWelcomeEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envoie avec le bon sujet et le prénom', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendWelcomeEmail } = await import('~~/server/utils/emailService');

    await sendWelcomeEmail('alice@example.com', 'Alice');

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { subject: string; to: string };

    expect(body.subject).toContain('Alice');
    expect(body.to).toBe('alice@example.com');
  });

  it('inclut un lien vers le dashboard', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendWelcomeEmail } = await import('~~/server/utils/emailService');

    await sendWelcomeEmail('alice@example.com', 'Alice');

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { html: string };

    expect(body.html).toContain('cursus.app/dashboard');
  });

  it('inclut un fallback texte brut non vide', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendWelcomeEmail } = await import('~~/server/utils/emailService');

    await sendWelcomeEmail('alice@example.com', 'Alice');

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { text: string };

    expect(body.text.length).toBeGreaterThan(0);
    // Le texte brut ne doit pas contenir de balises HTML
    expect(body.text).not.toContain('<p>');
    expect(body.text).not.toContain('<h1>');
  });
});

// ---- Tests : sendWeekReminderEmail ----

describe('sendWeekReminderEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envoie avec le titre du module dans le sujet', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendWeekReminderEmail } = await import('~~/server/utils/emailService');

    await sendWeekReminderEmail(
      'bob@example.com',
      'Bob',
      'Introduction à Git',
      new Date('2026-06-30'),
    );

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { subject: string };

    expect(body.subject).toContain('Introduction à Git');
  });

  it("mentionne la date d'échéance dans le HTML", async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendWeekReminderEmail } = await import('~~/server/utils/emailService');

    const dueDate = new Date('2026-06-30');
    await sendWeekReminderEmail('bob@example.com', 'Bob', 'Module 1', dueDate);

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { html: string };

    // La date doit apparaître dans le contenu
    expect(body.html).toContain('2026');
  });
});

// ---- Tests : sendAlertEmail ----

describe('sendAlertEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('envoie avec le nom du module et le retard en jours', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendAlertEmail } = await import('~~/server/utils/emailService');

    await sendAlertEmail('formateur@cursus.app', 'Marc', 'Atelier Docker', 3);

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { subject: string; html: string };

    expect(body.subject).toContain('Atelier Docker');
    expect(body.html).toContain('3');
  });

  it('pluralise correctement "jours"', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendAlertEmail } = await import('~~/server/utils/emailService');

    await sendAlertEmail('formateur@cursus.app', 'Marc', 'Atelier Docker', 1);

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { html: string };

    expect(body.html).toContain('1 jour');
    expect(body.html).not.toContain('1 jours');
  });
});

// ---- Tests : sendHarnessResultEmail ----

describe('sendHarnessResultEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('inclut le score dans le sujet et le HTML', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendHarnessResultEmail } = await import('~~/server/utils/emailService');

    await sendHarnessResultEmail('alice@example.com', 'Alice', 85, [
      { name: 'Tests unitaires', passed: true },
      { name: 'Lint', passed: true },
      { name: 'Coverage', passed: false, message: '72% < 80%' },
    ]);

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { subject: string; html: string };

    expect(body.subject).toContain('85');
    expect(body.html).toContain('85');
  });

  it('sujet positif si score >= 80', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendHarnessResultEmail } = await import('~~/server/utils/emailService');

    await sendHarnessResultEmail('alice@example.com', 'Alice', 90, [
      { name: 'Tests', passed: true },
    ]);

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { subject: string };

    expect(body.subject.toLowerCase()).toContain('valid');
  });

  it('sujet négatif si score < 80', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendHarnessResultEmail } = await import('~~/server/utils/emailService');

    await sendHarnessResultEmail('alice@example.com', 'Alice', 60, [
      { name: 'Tests', passed: false },
    ]);

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { subject: string };

    expect(body.subject.toLowerCase()).toContain('action');
  });

  it('liste les checks dans le HTML', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendHarnessResultEmail } = await import('~~/server/utils/emailService');

    await sendHarnessResultEmail('alice@example.com', 'Alice', 50, [
      { name: 'Tests unitaires', passed: true },
      { name: 'Coverage 80%', passed: false, message: 'Insuffisant' },
    ]);

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { html: string };

    expect(body.html).toContain('Tests unitaires');
    expect(body.html).toContain('Coverage 80%');
    expect(body.html).toContain('Insuffisant');
  });
});

// ---- Tests : sendInvitationEmail ----

describe('sendInvitationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inclut le lien d'invitation", async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendInvitationEmail } = await import('~~/server/utils/emailService');

    await sendInvitationEmail(
      'new@example.com',
      'Marc',
      'Promo Automne 2026',
      'https://cursus.app/invite/abc123',
    );

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { html: string; subject: string };

    expect(body.html).toContain('https://cursus.app/invite/abc123');
    expect(body.subject).toContain('Marc');
    expect(body.subject).toContain('Promo Automne 2026');
  });

  it('rejette une URL non-https (http://) — couvre safeHttpsUrl throw', async () => {
    const { sendInvitationEmail, EmailServiceError } = await import('~~/server/utils/emailService');
    await expect(
      sendInvitationEmail(
        'alice@example.com',
        'Marc',
        'Promo Automne 2026',
        'http://evil.com/invite/abc',
      ),
    ).rejects.toBeInstanceOf(EmailServiceError);
  });

  it('envoie en locale EN — couvre les branches EN de sendInvitationEmail', async () => {
    mockFetch.mockResolvedValueOnce(resendOkResponse());
    const { sendInvitationEmail } = await import('~~/server/utils/emailService');

    await sendInvitationEmail(
      'alice@example.com',
      'Marc',
      'Promo Automne 2026',
      'https://cursus.app/invite/abc123',
      'en',
    );

    const call = mockFetch.mock.calls[0]?.[1] as { body: string } | undefined;
    const body = JSON.parse(call?.body ?? '{}') as { subject: string; html: string };
    expect(body.subject).toContain('Marc');
    expect(body.html).toContain('You are invited');
  });
});
