/**
 * Utilitaires JWT pour les tokens d'invitation.
 * Algorithme HS256 (HMAC-SHA256) — clé symétrique 256 bits minimum.
 * Cf. ST-02.2 — considérations sécurité.
 *
 * ⚠️ JAMAIS loguer le token complet — contient une signature cryptographique.
 */
import { SignJWT, jwtVerify } from 'jose';

export interface InvitationPayload {
  email: string;
  cohorteId: string;
  /** Valeur de l'enum UserRole : STAGIAIRE | CO_FORMATEUR */
  role: string;
  invitationId: string;
}

/**
 * Récupère et encode le secret JWT depuis l'env.
 * Throw au démarrage si la variable est absente (fail-fast).
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env['INVITATION_JWT_SECRET'];
  if (!secret || secret.length < 32) {
    throw new Error(
      'INVITATION_JWT_SECRET manquant ou trop court (min 32 caractères). Cf. .env.example',
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signe un token d'invitation JWT avec HS256.
 *
 * @param payload   Données embarquées dans le token.
 * @param expiresInDays  Durée de validité en jours (1–30, défaut 7).
 * @returns JWT signé (string opaque).
 */
export async function signInvitationToken(
  payload: InvitationPayload,
  expiresInDays: number = 7,
): Promise<string> {
  const secret = getJwtSecret();

  return new SignJWT({
    email: payload.email,
    cohorteId: payload.cohorteId,
    role: payload.role,
    invitationId: payload.invitationId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInDays}d`)
    .setSubject(payload.email)
    .sign(secret);
}

/**
 * Vérifie la signature et l'expiration d'un token d'invitation.
 *
 * @throws JWTExpired     si le token est expiré.
 * @throws JWSInvalid     si la signature est incorrecte.
 * @throws JWTClaimValidationFailed si un claim obligatoire manque.
 */
export async function verifyInvitationToken(token: string): Promise<InvitationPayload> {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

  const email = payload['email'];
  const cohorteId = payload['cohorteId'];
  const role = payload['role'];
  const invitationId = payload['invitationId'];

  if (
    typeof email !== 'string' ||
    typeof cohorteId !== 'string' ||
    typeof role !== 'string' ||
    typeof invitationId !== 'string'
  ) {
    throw new Error('invitation.token.payloadInvalid — champs obligatoires manquants');
  }

  return { email, cohorteId, role, invitationId };
}
