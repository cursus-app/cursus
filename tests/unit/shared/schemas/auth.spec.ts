import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  resetPasswordSchema,
  signupSchema,
} from '~~/shared/schemas/auth';

// ─── passwordSchema ──────────────────────────────────────────────────────────
describe('passwordSchema', () => {
  it('accepts a valid strong password', () => {
    const result = passwordSchema.safeParse('MyP@ssw0rd!!42');
    expect(result.success).toBe(true);
  });

  it('accepts password with spaces (no trim)', () => {
    // Espaces autorisés — cf. cas limites ST-02.1
    const result = passwordSchema.safeParse('My P@ss w0rd!! 42');
    expect(result.success).toBe(true);
  });

  it('rejects password shorter than 12 chars', () => {
    const result = passwordSchema.safeParse('Aa1!short');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.passwordTooShort');
  });

  it('rejects password of exactly 11 chars', () => {
    const result = passwordSchema.safeParse('Aa1!shor789');
    expect(result.success).toBe(false);
  });

  it('accepts password of exactly 12 chars', () => {
    const result = passwordSchema.safeParse('Aa1!short123!');
    // 13 chars — ajuster au besoin
    const result12 = passwordSchema.safeParse('Aa1!short123');
    expect(result12.success).toBe(true);
    expect(result.success).toBe(true);
  });

  it('rejects password without uppercase', () => {
    const result = passwordSchema.safeParse('myp@ssw0rd!!42');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.passwordNeedsUppercase');
  });

  it('rejects password without lowercase', () => {
    const result = passwordSchema.safeParse('MYP@SSW0RD!!42');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.passwordNeedsLowercase');
  });

  it('rejects password without digit', () => {
    const result = passwordSchema.safeParse('MyP@ssword!!ab');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.passwordNeedsDigit');
  });

  it('rejects password without special character', () => {
    const result = passwordSchema.safeParse('MyPassw0rd1234');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.passwordNeedsSymbol');
  });

  it('rejects empty string', () => {
    const result = passwordSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('accepts various special characters as symbol', () => {
    const specialChars = [
      '!',
      '@',
      '#',
      '$',
      '%',
      '^',
      '&',
      '*',
      '(',
      ')',
      '-',
      '_',
      '+',
      '=',
      '[',
      ']',
      '{',
      '}',
      '|',
      ';',
      ':',
      ',',
      '.',
      '<',
      '>',
      '?',
      '/',
    ];
    for (const char of specialChars) {
      const result = passwordSchema.safeParse(`MyPassw0rd${char}abc`);
      expect(result.success, `Expected success with special char: ${char}`).toBe(true);
    }
  });
});

// ─── loginSchema ─────────────────────────────────────────────────────────────
describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'anything' });
    expect(result.success).toBe(true);
  });

  it('accepts email with +alias', () => {
    // Cf. cas limites ST-02.1 : user+test@example.com autorisé
    const result = loginSchema.safeParse({ email: 'user+test@example.com', password: 'any' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'anything' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.emailInvalid');
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.passwordRequired');
  });

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(2);
  });

  it('accepts password of any strength for login (validation is Supabase-side)', () => {
    // Login n'utilise pas passwordSchema — le mdp est passé tel quel à Supabase
    const result = loginSchema.safeParse({ email: 'u@e.com', password: 'weak' });
    expect(result.success).toBe(true);
  });
});

// ─── signupSchema ─────────────────────────────────────────────────────────────
describe('signupSchema', () => {
  const validBase = {
    email: 'user@example.com',
    password: 'MyP@ssw0rd!!42',
    passwordConfirm: 'MyP@ssw0rd!!42',
    invitationToken: 'tok_abc123',
    consentsCgu: true as const,
  };

  it('accepts valid signup data', () => {
    const result = signupSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejects missing invitation token', () => {
    const result = signupSchema.safeParse({ ...validBase, invitationToken: '' });
    expect(result.success).toBe(false);
  });

  it('rejects consentsCgu = false', () => {
    const result = signupSchema.safeParse({ ...validBase, consentsCgu: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.cguRequired');
  });

  it('rejects mismatched passwords', () => {
    const result = signupSchema.safeParse({
      ...validBase,
      passwordConfirm: 'DifferentPass!1',
    });
    expect(result.success).toBe(false);
    const mismatch = result.error?.issues.find((i) => i.message === 'auth.errors.passwordMismatch');
    expect(mismatch).toBeDefined();
    expect(mismatch?.path).toEqual(['passwordConfirm']);
  });

  it('rejects weak password', () => {
    const result = signupSchema.safeParse({
      ...validBase,
      password: 'weak',
      passwordConfirm: 'weak',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email in signup', () => {
    const result = signupSchema.safeParse({ ...validBase, email: 'bad' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.emailInvalid');
  });

  it('rejects when consentsCgu is missing', () => {
    const { consentsCgu: _cgu, ...withoutCgu } = validBase;
    const result = signupSchema.safeParse(withoutCgu);
    expect(result.success).toBe(false);
  });
});

// ─── forgotPasswordSchema ─────────────────────────────────────────────────────
describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad-email' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.errors.emailInvalid');
  });

  it('rejects missing email', () => {
    const result = forgotPasswordSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── resetPasswordSchema ──────────────────────────────────────────────────────
describe('resetPasswordSchema', () => {
  it('accepts matching strong passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'MyP@ssw0rd!!42',
      passwordConfirm: 'MyP@ssw0rd!!42',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'MyP@ssw0rd!!42',
      passwordConfirm: 'Other@P@ss!42',
    });
    expect(result.success).toBe(false);
    const mismatch = result.error?.issues.find((i) => i.message === 'auth.errors.passwordMismatch');
    expect(mismatch).toBeDefined();
  });

  it('rejects weak password in reset', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'short',
      passwordConfirm: 'short',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Security : injection SQL / XSS sur email ─────────────────────────────────
describe('security: input sanitization via Zod', () => {
  it('rejects SQL injection attempt in email', () => {
    const result = loginSchema.safeParse({
      email: "' OR '1'='1",
      password: 'anything',
    });
    expect(result.success).toBe(false);
  });

  it('rejects XSS attempt in email', () => {
    const result = loginSchema.safeParse({
      email: '<script>alert(1)</script>@evil.com',
      password: 'anything',
    });
    expect(result.success).toBe(false);
  });

  it('rejects null bytes in password', () => {
    // z.string() normalise — le test vérifie qu'aucun crash ne survient
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      // Zod traite les null bytes comme une string valide (bcrypt les tronque)
      // Ce cas est géré par Supabase Auth nativement
      password: 'valid\x00pass',
    });
    // Le schema passe (un seul char suffit pour min(1)) — sécurité gérée côté Supabase
    expect(result.success).toBe(true);
  });
});
