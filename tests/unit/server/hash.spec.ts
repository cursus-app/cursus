// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { hashId, hashEmail, stablePseudoId } from '~~/server/utils/hash';

describe('server/utils/hash', () => {
  describe('hashId()', () => {
    it('retourne une chaîne hex de 16 caractères', () => {
      const result = hashId('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toHaveLength(16);
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('est déterministe — même input → même output', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      expect(hashId(id)).toBe(hashId(id));
    });

    it('produit des hashes différents pour des IDs différents', () => {
      expect(hashId('id-alice')).not.toBe(hashId('id-bob'));
    });

    it("ne contient pas l'ID original", () => {
      const id = 'my-sensitive-user-id';
      expect(hashId(id)).not.toContain(id);
    });
  });

  describe('hashEmail()', () => {
    it('retourne une chaîne hex de 16 caractères', () => {
      const result = hashEmail('alice@example.com');
      expect(result).toHaveLength(16);
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('est insensible à la casse', () => {
      expect(hashEmail('Alice@Example.COM')).toBe(hashEmail('alice@example.com'));
    });

    it('ignore les espaces en début/fin', () => {
      expect(hashEmail('  alice@example.com  ')).toBe(hashEmail('alice@example.com'));
    });

    it("ne contient pas l'email original", () => {
      const email = 'sensitive@example.com';
      expect(hashEmail(email)).not.toContain(email);
    });
  });

  describe('stablePseudoId()', () => {
    it('retourne un UUID v4 synthétique (format valide)', () => {
      const pseudo = stablePseudoId('user-123', 'secret');
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(pseudo).toMatch(uuidPattern);
    });

    it('est stable — 2 appels successifs → même UUID pseudonyme', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const secret = 'my-app-secret';
      expect(stablePseudoId(userId, secret)).toBe(stablePseudoId(userId, secret));
    });

    it('produit des pseudonymes différents pour des users différents', () => {
      const secret = 'my-app-secret';
      expect(stablePseudoId('user-alice', secret)).not.toBe(stablePseudoId('user-bob', secret));
    });

    it('produit des pseudonymes différents pour des secrets différents', () => {
      const userId = 'user-alice';
      expect(stablePseudoId(userId, 'secret-1')).not.toBe(stablePseudoId(userId, 'secret-2'));
    });

    it("ne contient pas l'userId original dans le résultat", () => {
      const userId = 'my-identifiable-user-id';
      const pseudo = stablePseudoId(userId, 'secret');
      expect(pseudo).not.toContain(userId);
    });
  });
});
