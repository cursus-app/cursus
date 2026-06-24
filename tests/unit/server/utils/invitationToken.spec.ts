// @vitest-environment node
/**
 * Tests unitaires pour server/utils/invitationToken.ts
 * Cf. ST-02.2 — Tests à écrire : génération + vérification JWT.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';

// Secret de test (≥32 chars)
const TEST_SECRET = 'test-secret-for-unit-tests-at-least-32-chars!!';

// Injecter le secret AVANT l'import du module (les tests réinitialisent modules)
process.env['INVITATION_JWT_SECRET'] = TEST_SECRET;

const PAYLOAD = {
  email: 'karim@test.com',
  cohorteId: '00000000-0000-0000-0000-000000000001',
  role: 'STAGIAIRE',
  invitationId: '00000000-0000-0000-0000-000000000002',
} as const;

describe('server/utils/invitationToken', () => {
  beforeEach(() => {
    process.env['INVITATION_JWT_SECRET'] = TEST_SECRET;
  });

  it('signe un token avec les claims attendus', async () => {
    const { signInvitationToken } = await import('~~/server/utils/invitationToken');
    const token = await signInvitationToken(PAYLOAD, 7);

    // Un JWT est composé de 3 segments séparés par des points
    expect(token.split('.')).toHaveLength(3);
  });

  it('vérifie un token valide et retourne le payload', async () => {
    const { signInvitationToken, verifyInvitationToken } = await import(
      '~~/server/utils/invitationToken'
    );
    const token = await signInvitationToken(PAYLOAD, 7);
    const verified = await verifyInvitationToken(token);

    expect(verified.email).toBe(PAYLOAD.email);
    expect(verified.cohorteId).toBe(PAYLOAD.cohorteId);
    expect(verified.role).toBe(PAYLOAD.role);
    expect(verified.invitationId).toBe(PAYLOAD.invitationId);
  });

  it('rejette un token dont la signature est altérée', async () => {
    const { signInvitationToken, verifyInvitationToken } = await import(
      '~~/server/utils/invitationToken'
    );
    const token = await signInvitationToken(PAYLOAD, 7);
    // Altérer les 5 derniers caractères de la signature (3e segment)
    const [header, claims, sig] = token.split('.');
    const tampered = `${header}.${claims}.${sig!.slice(0, -5)}XXXXX`;

    await expect(verifyInvitationToken(tampered)).rejects.toThrow();
  });

  it('rejette un token forgé avec une clé incorrecte', async () => {
    const { verifyInvitationToken } = await import('~~/server/utils/invitationToken');
    const wrongSecret = new TextEncoder().encode('completely-wrong-secret-at-least-32-chars!!');

    const forgedToken = await new SignJWT({ ...PAYLOAD })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(wrongSecret);

    await expect(verifyInvitationToken(forgedToken)).rejects.toThrow();
  });

  it('rejette un token expiré', async () => {
    const { verifyInvitationToken } = await import('~~/server/utils/invitationToken');
    const secret = new TextEncoder().encode(TEST_SECRET);

    // Créer un token avec une expiration dans le passé
    const expiredToken = await new SignJWT({ ...PAYLOAD })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120) // il y a 2 minutes
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60) // expiré il y a 1 minute
      .sign(secret);

    await expect(verifyInvitationToken(expiredToken)).rejects.toThrow();
  });

  it("throw si INVITATION_JWT_SECRET n'est pas défini", async () => {
    // Supprimer la variable d'env pour ce test
    const savedSecret = process.env['INVITATION_JWT_SECRET'];
    delete process.env['INVITATION_JWT_SECRET'];

    // On doit re-importer le module sans cache pour que getJwtSecret() soit ré-évalué
    // (l'import du module est mis en cache dans ce describe — on teste directement
    // le comportement au runtime en passant un secret vide)
    const { signInvitationToken } = await import('~~/server/utils/invitationToken');

    await expect(signInvitationToken(PAYLOAD, 7)).rejects.toThrow(
      'INVITATION_JWT_SECRET manquant',
    );

    // Restaurer
    process.env['INVITATION_JWT_SECRET'] = savedSecret;
  });

  it("respecte la duree d'expiration passee en parametre", async () => {
    const { signInvitationToken } = await import('~~/server/utils/invitationToken');
    const { decodeJwt } = await import('jose');

    const token = await signInvitationToken(PAYLOAD, 14);
    const decoded = decodeJwt(token);

    // L'exp doit être ~14 jours dans le futur (tolérance ±60s)
    const expectedExp = Math.floor(Date.now() / 1000) + 14 * 24 * 3600;
    expect(decoded['exp']).toBeGreaterThan(expectedExp - 60);
    expect(decoded['exp']).toBeLessThan(expectedExp + 60);
  });
});
