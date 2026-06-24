// @vitest-environment node
//
// Tests unitaires pour les callbacks `beforeSend` de Sentry (client + serveur).
// On mock `@sentry/nuxt` pour capturer la config passee a `Sentry.init` sans
// declencher le vrai SDK -- pas de reseau, pas de DSN reel requis.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Event } from '@sentry/nuxt';

// --- Helpers de construction d'Event Sentry minimal --------------------------

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    event_id: 'abc123',
    ...overrides,
  };
}

function makeErrorEvent(message: string): Event {
  return makeEvent({
    exception: {
      values: [{ type: 'Error', value: message }],
    },
  });
}

// --- Setup : mock @sentry/nuxt avant chaque import du fichier de config ------

type BeforeSend = (event: Event) => Event | null;

type InitOptions = {
  beforeSend?: BeforeSend;
  dsn?: string;
  environment?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  integrations?: unknown[];
};

let capturedClientOptions: InitOptions = {};
let capturedServerOptions: InitOptions = {};

// Mocks declares une seule fois -- reset entre tests via vi.resetModules()
vi.mock('@sentry/nuxt', () => {
  return {
    init: vi.fn((options: InitOptions) => {
      void options;
    }),
    replayIntegration: vi.fn(() => ({ name: 'Replay' })),
  };
});

// Asserte que beforeSend est defini et retourne une fonction typee (evite les `!`)
function getBeforeSend(options: InitOptions): BeforeSend {
  expect(options.beforeSend).toBeDefined();
  // Le expect ci-dessus garantit la presence — le cast est sur.
  return options.beforeSend as BeforeSend;
}

// --- Suite client ------------------------------------------------------------

describe('sentry.client.config -- beforeSend', () => {
  let beforeSend: BeforeSend;

  beforeEach(async () => {
    vi.resetModules();
    process.env['NUXT_PUBLIC_SENTRY_DSN'] = 'https://abc@sentry.io/123';
    process.env['NODE_ENV'] = 'test';

    const { init } = await import('@sentry/nuxt');
    vi.mocked(init).mockImplementationOnce((options: InitOptions) => {
      capturedClientOptions = options;
    });

    await import('~~/sentry.client.config');
    beforeSend = getBeforeSend(capturedClientOptions);
  });

  afterEach(() => {
    delete process.env['NUXT_PUBLIC_SENTRY_DSN'];
    capturedClientOptions = {};
  });

  it('retourne null pour ResizeObserver loop limit exceeded', () => {
    expect(beforeSend(makeErrorEvent('ResizeObserver loop limit exceeded'))).toBeNull();
  });

  it('retourne null pour variante ResizeObserver loop detected', () => {
    expect(beforeSend(makeErrorEvent('ResizeObserver loop detected'))).toBeNull();
  });

  it('retourne null pour Network request failed', () => {
    expect(beforeSend(makeErrorEvent('Network request failed'))).toBeNull();
  });

  it('retourne null pour Load failed', () => {
    expect(beforeSend(makeErrorEvent('Load failed'))).toBeNull();
  });

  it('retourne null pour Failed to fetch', () => {
    expect(beforeSend(makeErrorEvent('Failed to fetch dynamically'))).toBeNull();
  });

  it('retourne null pour ChunkLoadError', () => {
    expect(beforeSend(makeErrorEvent('ChunkLoadError: Loading chunk 42 failed'))).toBeNull();
  });

  it('retourne event pour une erreur actionnable standard', () => {
    const event = makeErrorEvent('TypeError: Cannot read properties of undefined');
    expect(beforeSend(event)).toBe(event);
  });

  it("retourne event pour une erreur d'authentification", () => {
    const event = makeErrorEvent('Unauthorized: token expired');
    expect(beforeSend(event)).toBe(event);
  });

  it('scrube les IDs utilisateur dans les URLs de requete', () => {
    const event = makeEvent({
      request: { url: 'https://cursus.io/api/users/uuid-1234-abcd/profile' },
    });
    const result = beforeSend(event);
    expect(result).not.toBeNull();
    expect(result?.request?.url).toBe('https://cursus.io/api/users/[id]/profile');
  });

  it('scrube plusieurs segments /users/<id> dans une meme URL', () => {
    const event = makeEvent({
      request: { url: 'https://cursus.io/users/abc-def/cohorts/users/xyz-789' },
    });
    const result = beforeSend(event);
    expect(result?.request?.url).toBe('https://cursus.io/users/[id]/cohorts/users/[id]');
  });

  it('ne modifie pas URL sans segment /users/<id>', () => {
    const url = 'https://cursus.io/api/cohorts/42';
    const event = makeEvent({ request: { url } });
    const result = beforeSend(event);
    expect(result?.request?.url).toBe(url);
  });

  it("n'initialise pas Sentry si DSN absent", async () => {
    vi.resetModules();
    delete process.env['NUXT_PUBLIC_SENTRY_DSN'];

    const { init } = await import('@sentry/nuxt');
    const mockInit = vi.mocked(init);
    mockInit.mockClear();

    await import('~~/sentry.client.config');
    expect(mockInit).not.toHaveBeenCalled();
  });
});

// --- Suite serveur -----------------------------------------------------------

describe('sentry.server.config -- beforeSend', () => {
  let beforeSend: BeforeSend;

  beforeEach(async () => {
    vi.resetModules();
    process.env['NUXT_PUBLIC_SENTRY_DSN'] = 'https://abc@sentry.io/123';
    process.env['NODE_ENV'] = 'test';

    const { init } = await import('@sentry/nuxt');
    vi.mocked(init).mockImplementationOnce((options: InitOptions) => {
      capturedServerOptions = options;
    });

    await import('~~/sentry.server.config');
    beforeSend = getBeforeSend(capturedServerOptions);
  });

  afterEach(() => {
    delete process.env['NUXT_PUBLIC_SENTRY_DSN'];
    capturedServerOptions = {};
  });

  it("supprime l'email de l'objet user avant envoi", () => {
    const event = makeEvent({
      user: { id: 'hash-1234', email: 'user@example.com', ip_address: '192.168.1.1' },
    });
    const result = beforeSend(event);
    expect(result).not.toBeNull();
    expect(result?.user?.email).toBeUndefined();
  });

  it("supprime l'IP de l'objet user avant envoi", () => {
    const event = makeEvent({
      user: { id: 'hash-1234', email: 'user@example.com', ip_address: '10.0.0.1' },
    });
    const result = beforeSend(event);
    expect(result?.user?.ip_address).toBeUndefined();
  });

  it("conserve l'ID hash de l'utilisateur", () => {
    const event = makeEvent({
      user: { id: 'sha256-hash-deadbeef', email: 'user@example.com' },
    });
    const result = beforeSend(event);
    expect(result?.user?.id).toBe('sha256-hash-deadbeef');
  });

  it('retourne event intact si pas d objet user', () => {
    const event = makeErrorEvent('Something went wrong on the server');
    expect(beforeSend(event)).toBe(event);
  });

  it("n'initialise pas Sentry si DSN absent", async () => {
    vi.resetModules();
    delete process.env['NUXT_PUBLIC_SENTRY_DSN'];

    const { init } = await import('@sentry/nuxt');
    const mockInit = vi.mocked(init);
    mockInit.mockClear();

    await import('~~/sentry.server.config');
    expect(mockInit).not.toHaveBeenCalled();
  });
});
