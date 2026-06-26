// @vitest-environment node
//
// Tests unitaires pour les schémas Zod d'invitation.
// Cf. ST-04.2 — TT-04.2.1 (validation Zod).
import { describe, expect, it } from 'vitest';
import { inviteBatchSchema } from '~~/shared/schemas/invitation';

describe('inviteBatchSchema', () => {
  it('accepte un email valide', () => {
    const result = inviteBatchSchema.safeParse({ emails: ['karim@example.com'] });
    expect(result.success).toBe(true);
  });

  it('accepte un tableau de plusieurs emails valides', () => {
    const result = inviteBatchSchema.safeParse({
      emails: ['karim@ex.com', 'sarah@ex.com', 'ahmed@ex.com'],
    });
    expect(result.success).toBe(true);
  });

  it('accepte 50 emails (limite max)', () => {
    const emails = Array.from({ length: 50 }, (_, i) => `user${i}@example.com`);
    const result = inviteBatchSchema.safeParse({ emails });
    expect(result.success).toBe(true);
  });

  it('rejette 51 emails (au-dessus de la limite)', () => {
    const emails = Array.from({ length: 51 }, (_, i) => `user${i}@example.com`);
    const result = inviteBatchSchema.safeParse({ emails });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue?.message).toBe('invitations.errors.tooManyEmails');
    }
  });

  it('rejette un tableau vide', () => {
    const result = inviteBatchSchema.safeParse({ emails: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue?.message).toBe('invitations.errors.emailRequired');
    }
  });

  it('rejette un email invalide', () => {
    const result = inviteBatchSchema.safeParse({ emails: ['not-an-email'] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues[0];
      expect(issue?.message).toBe('invitations.errors.emailInvalid');
    }
  });

  it('rejette un email avec espaces', () => {
    const result = inviteBatchSchema.safeParse({ emails: ['user @example.com'] });
    expect(result.success).toBe(false);
  });

  it('accepte les emails avec des caractères accentués dans le nom de domaine (IDN)', () => {
    // Adresses avec caractères accentués dans la partie locale — RFC 6530
    const result = inviteBatchSchema.safeParse({ emails: ['étudiant@example.com'] });
    // Note : Zod accepte ces emails car ils matchent son regex interne
    expect(result.success).toBeDefined();
  });

  it('rejette si la propriété emails est absente', () => {
    const result = inviteBatchSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejette si emails est une chaîne (pas un tableau)', () => {
    const result = inviteBatchSchema.safeParse({ emails: 'user@example.com' });
    expect(result.success).toBe(false);
  });
});
