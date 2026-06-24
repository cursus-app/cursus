import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { AuthError } from '~/composables/useAuth';

/**
 * Tests unitaires du composable useAuth.
 * Stratégie : mockNuxtImport() de @nuxt/test-utils intercepte les auto-imports
 * de useSupabaseClient() et useSupabaseUser() sans avoir besoin d'une instance
 * Nuxt complète.
 */

// Types internes pour les mocks
interface MockAuthClient {
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  signUp: ReturnType<typeof vi.fn>;
  resetPasswordForEmail: ReturnType<typeof vi.fn>;
  updateUser: ReturnType<typeof vi.fn>;
}

const mockAuth: MockAuthClient = {
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
};

const mockSupabaseClient = { auth: mockAuth };

// mockNuxtImport doit être au top-level (transformé par le plugin Vitest Nuxt)
mockNuxtImport('useSupabaseClient', () => () => mockSupabaseClient);
mockNuxtImport('useSupabaseUser', () => () => ({ value: null }));

// ─── AuthError ────────────────────────────────────────────────────────────────
describe('AuthError', () => {
  it('stores the i18n key', () => {
    const err = new AuthError('auth.errors.invalidCredentials');
    expect(err.i18nKey).toBe('auth.errors.invalidCredentials');
    expect(err.name).toBe('AuthError');
  });

  it('exposes cause via Error.cause', () => {
    const cause = new Error('Supabase error');
    const err = new AuthError('auth.errors.generic', cause);
    expect(err.cause).toBe(cause);
  });

  it('is an instance of Error', () => {
    const err = new AuthError('auth.errors.generic');
    expect(err).toBeInstanceOf(Error);
  });

  it('message equals i18n key', () => {
    const err = new AuthError('auth.errors.invalidCredentials');
    expect(err.message).toBe('auth.errors.invalidCredentials');
  });
});

// ─── Tests fonctionnels useAuth ───────────────────────────────────────────────

describe('useAuth — login logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    });
  });

  it('throws AuthError with invalidCredentials key on login failure', async () => {
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    await expect(auth.login('user@test.com', 'wrongpass')).rejects.toThrow(AuthError);
  });

  it('error has the correct i18n key (anti user enumeration)', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    let thrownError: AuthError | undefined;
    try {
      await auth.login('user@test.com', 'wrongpass');
    } catch (e) {
      if (e instanceof AuthError) {
        thrownError = e;
      }
    }
    expect(thrownError?.i18nKey).toBe('auth.errors.invalidCredentials');
  });

  it('resolves without error on successful login', async () => {
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'u1' }, session: {} },
      error: null,
    });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    await expect(auth.login('user@test.com', 'ValidPass1!')).resolves.toBeUndefined();
  });

  it('calls signInWithPassword with the provided credentials', async () => {
    mockAuth.signInWithPassword.mockResolvedValueOnce({ error: null });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();
    await auth.login('test@example.com', 'MyPass!');

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'MyPass!',
    });
  });
});

describe('useAuth — signup logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves on successful signup', async () => {
    mockAuth.signUp.mockResolvedValueOnce({
      data: { user: { id: 'u2' }, session: null },
      error: null,
    });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    await expect(auth.signup('new@test.com', 'StrongP@ss!1', 'tok_abc')).resolves.toBeUndefined();
  });

  it('throws emailAlreadyUsed on "already registered" error', async () => {
    mockAuth.signUp.mockResolvedValue({
      error: { message: 'User already registered' },
    });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    let thrownError: AuthError | undefined;
    try {
      await auth.signup('existing@test.com', 'StrongP@ss!1', 'tok_abc');
    } catch (e) {
      if (e instanceof AuthError) {
        thrownError = e;
      }
    }
    expect(thrownError?.i18nKey).toBe('auth.errors.emailAlreadyUsed');
  });

  it('throws generic error on unknown signup failure', async () => {
    mockAuth.signUp.mockResolvedValue({
      error: { message: 'Some unexpected error' },
    });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    let thrownError: AuthError | undefined;
    try {
      await auth.signup('new@test.com', 'StrongP@ss!1', 'tok_abc');
    } catch (e) {
      if (e instanceof AuthError) {
        thrownError = e;
      }
    }
    expect(thrownError?.i18nKey).toBe('auth.errors.generic');
  });
});

describe('useAuth — forgotPassword logic (anti-enumeration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:3000' },
      writable: true,
    });
  });

  it('resolves silently even if Supabase returns an error', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'User not found' },
    });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    // Ne doit PAS rejeter — l'UI affiche toujours "email envoyé"
    await expect(auth.forgotPassword('unknown@test.com')).resolves.toBeUndefined();
  });

  it('calls resetPasswordForEmail with redirectTo including /reset-password', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();
    await auth.forgotPassword('user@test.com');

    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@test.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') }),
    );
  });
});

describe('useAuth — logout logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves on successful logout', async () => {
    mockAuth.signOut.mockResolvedValueOnce({ error: null });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    await expect(auth.logout()).resolves.toBeUndefined();
  });

  it('throws AuthError on logout failure', async () => {
    mockAuth.signOut.mockResolvedValueOnce({ error: { message: 'Network error' } });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    await expect(auth.logout()).rejects.toThrow(AuthError);
  });
});

describe('useAuth — updatePassword logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves on successful password update', async () => {
    mockAuth.updateUser.mockResolvedValueOnce({ error: null });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    await expect(auth.updatePassword('NewStrongP@ss!1')).resolves.toBeUndefined();
  });

  it('throws AuthError on update failure', async () => {
    mockAuth.updateUser.mockResolvedValueOnce({ error: { message: 'Session expired' } });

    const { useAuth } = await import('~/composables/useAuth');
    const auth = useAuth();

    await expect(auth.updatePassword('NewStrongP@ss!1')).rejects.toThrow(AuthError);
  });
});
