import { describe, expect, it } from 'vitest';
import { updateProfileSchema, deleteAccountSchema } from '~~/shared/schemas/profile';

// ─── updateProfileSchema ──────────────────────────────────────────────────────

describe('updateProfileSchema', () => {
  it('accepts a valid full profile update', () => {
    const result = updateProfileSchema.safeParse({
      fullName: 'Alice Dupont',
      bio: 'Développeuse passionnée.',
      locale: 'fr',
      timezone: 'Europe/Paris',
      isPublic: true,
      publicSlug: 'alice-dupont',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an empty object (all fields optional)', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update (only fullName)', () => {
    const result = updateProfileSchema.safeParse({ fullName: 'Bob' });
    expect(result.success).toBe(true);
  });

  it('rejects fullName longer than 100 characters', () => {
    const result = updateProfileSchema.safeParse({
      fullName: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.message).toBe('profile.errors.fullNameTooLong');
  });

  it('rejects fullName of exactly 0 characters (empty string)', () => {
    const result = updateProfileSchema.safeParse({ fullName: '' });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.message).toBe('profile.errors.fullNameRequired');
  });

  it('accepts fullName of exactly 100 characters', () => {
    const result = updateProfileSchema.safeParse({ fullName: 'A'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('rejects bio longer than 500 characters', () => {
    const result = updateProfileSchema.safeParse({
      bio: 'B'.repeat(501),
    });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.message).toBe('profile.errors.bioTooLong');
  });

  it('accepts bio of exactly 500 characters', () => {
    const result = updateProfileSchema.safeParse({ bio: 'B'.repeat(500) });
    expect(result.success).toBe(true);
  });

  it('accepts bio empty string', () => {
    const result = updateProfileSchema.safeParse({ bio: '' });
    expect(result.success).toBe(true);
  });

  it('rejects publicSlug with spaces', () => {
    const result = updateProfileSchema.safeParse({ publicSlug: 'alice dupont' });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.message).toBe('profile.errors.slugInvalidChars');
  });

  it('rejects publicSlug with uppercase characters', () => {
    const result = updateProfileSchema.safeParse({ publicSlug: 'AliceDupont' });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.message).toBe('profile.errors.slugInvalidChars');
  });

  it('rejects publicSlug with special characters (underscore)', () => {
    const result = updateProfileSchema.safeParse({ publicSlug: 'alice_dupont' });
    expect(result.success).toBe(false);
  });

  it('rejects publicSlug shorter than 3 characters', () => {
    const result = updateProfileSchema.safeParse({ publicSlug: 'ab' });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.message).toBe('profile.errors.slugTooShort');
  });

  it('rejects publicSlug longer than 50 characters', () => {
    const result = updateProfileSchema.safeParse({ publicSlug: 'a'.repeat(51) });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.message).toBe('profile.errors.slugTooLong');
  });

  it('accepts publicSlug with only lowercase, digits and hyphens', () => {
    const result = updateProfileSchema.safeParse({ publicSlug: 'alice-42' });
    expect(result.success).toBe(true);
  });

  it('accepts publicSlug null (suppression du slug)', () => {
    const result = updateProfileSchema.safeParse({ publicSlug: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publicSlug).toBeNull();
    }
  });

  it('accepts publicSlug of exactly 3 characters', () => {
    const result = updateProfileSchema.safeParse({ publicSlug: 'abc' });
    expect(result.success).toBe(true);
  });

  it('accepts publicSlug of exactly 50 characters', () => {
    const result = updateProfileSchema.safeParse({ publicSlug: 'a'.repeat(50) });
    expect(result.success).toBe(true);
  });

  it('rejects invalid locale value', () => {
    const result = updateProfileSchema.safeParse({ locale: 'de' });
    expect(result.success).toBe(false);
  });

  it('accepts locale "fr"', () => {
    const result = updateProfileSchema.safeParse({ locale: 'fr' });
    expect(result.success).toBe(true);
  });

  it('accepts locale "en"', () => {
    const result = updateProfileSchema.safeParse({ locale: 'en' });
    expect(result.success).toBe(true);
  });

  it('accepts isPublic boolean true', () => {
    const result = updateProfileSchema.safeParse({ isPublic: true });
    expect(result.success).toBe(true);
  });

  it('accepts isPublic boolean false', () => {
    const result = updateProfileSchema.safeParse({ isPublic: false });
    expect(result.success).toBe(true);
  });
});

// ─── deleteAccountSchema ──────────────────────────────────────────────────────

describe('deleteAccountSchema', () => {
  it('accepts valid email and password', () => {
    const result = deleteAccountSchema.safeParse({
      email: 'user@example.com',
      password: 'MyP@ssw0rd!!42',
    });
    expect(result.success).toBe(true);
  });

  it('accepts email with +alias', () => {
    const result = deleteAccountSchema.safeParse({
      email: 'user+test@example.com',
      password: 'anypassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = deleteAccountSchema.safeParse({
      email: 'not-an-email',
      password: 'anypassword',
    });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.message).toBe('profile.errors.emailInvalid');
  });

  it('rejects empty email', () => {
    const result = deleteAccountSchema.safeParse({
      email: '',
      password: 'anypassword',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = deleteAccountSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.message).toBe('profile.errors.passwordRequired');
  });

  it('rejects missing both fields', () => {
    const result = deleteAccountSchema.safeParse({});
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(2);
  });

  it('rejects missing password field', () => {
    const result = deleteAccountSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(false);
  });

  it('rejects missing email field', () => {
    const result = deleteAccountSchema.safeParse({ password: 'anypassword' });
    expect(result.success).toBe(false);
  });

  it('accepts password with a single character (no strength requirement at deletion)', () => {
    // À la suppression, on vérifie juste que le mdp est non vide — la force est
    // contrôlée par Supabase Auth à la création.
    const result = deleteAccountSchema.safeParse({
      email: 'user@example.com',
      password: 'x',
    });
    expect(result.success).toBe(true);
  });
});
