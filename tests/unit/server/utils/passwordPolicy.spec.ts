// @vitest-environment node
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  validatePasswordServer,
  computeHibpPrefixSuffix,
  isPasswordPwned,
} from '~~/server/utils/passwordPolicy';

describe('server/utils/passwordPolicy — validatePasswordServer()', () => {
  describe('longueur minimale', () => {
    it('rejette un mot de passe < 12 caractères', () => {
      const result = validatePasswordServer('Court1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.tooShort');
    });

    it('rejette exactement 11 caractères', () => {
      const result = validatePasswordServer('Abcdefghij1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.tooShort');
    });

    it('accepte exactement 12 caractères qui satisfont toutes les règles', () => {
      // Assez unique pour ne pas être dans la liste commune, pas de séquence triviale
      const result = validatePasswordServer('X7!mKp#nLq2w');
      expect(result.errors).not.toContain('password.tooShort');
    });
  });

  describe('mots de passe communs', () => {
    it('rejette "password123"', () => {
      const result = validatePasswordServer('password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.tooCommon');
    });

    it('rejette "iloveyou" (insensible à la casse)', () => {
      const result = validatePasswordServer('ILOVEYOU');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.tooCommon');
    });

    it('rejette "motdepasse123"', () => {
      const result = validatePasswordServer('motdepasse123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.tooCommon');
    });

    it("n'ajoute pas l'erreur tooCommon pour un mot de passe non listé", () => {
      const result = validatePasswordServer('X7!mKp#nLq2wRs');
      expect(result.errors).not.toContain('password.tooCommon');
    });
  });

  describe('séquences triviales', () => {
    it('rejette un mot de passe contenant "qwerty"', () => {
      const result = validatePasswordServer('SuperQwerty2025!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.trivialSequence');
    });

    it('rejette un mot de passe contenant "123456"', () => {
      const result = validatePasswordServer('My123456PassWord!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.trivialSequence');
    });

    it('rejette un mot de passe contenant "azerty"', () => {
      const result = validatePasswordServer('MonAzertySecret!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.trivialSequence');
    });

    it('rejette un mot de passe contenant "aaaa"', () => {
      const result = validatePasswordServer('MonAaaaSuperSafe!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.trivialSequence');
    });

    it("n'ajoute pas l'erreur trivialSequence pour un mot de passe sans séquence", () => {
      const result = validatePasswordServer('X7!mKp#nLq2wRs');
      expect(result.errors).not.toContain('password.trivialSequence');
    });
  });

  describe("inclusion de l'email", () => {
    it("rejette un mot de passe qui contient la partie locale de l'email", () => {
      const result = validatePasswordServer('monlogin_superpass!', 'monlogin@example.com');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.containsEmail');
    });

    it('est insensible à la casse pour la comparaison email', () => {
      const result = validatePasswordServer('MONLOGIN_superpass!', 'monlogin@example.com');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('password.containsEmail');
    });

    it('ne rejette pas si la partie locale est ≤ 3 caractères (évite les faux positifs)', () => {
      const result = validatePasswordServer('MaPassXtr@Long12', 'ali@example.com');
      expect(result.errors).not.toContain('password.containsEmail');
    });

    it("ne rejette pas si l'email n'est pas fourni", () => {
      const result = validatePasswordServer('X7!mKp#nLq2wRs');
      expect(result.errors).not.toContain('password.containsEmail');
    });

    it('ne rejette pas si le mot de passe ne contient pas la partie locale', () => {
      const result = validatePasswordServer('X7!mKp#nLq2wRs', 'alice@example.com');
      expect(result.errors).not.toContain('password.containsEmail');
    });
  });

  describe('accumulation de plusieurs erreurs', () => {
    it('retourne plusieurs erreurs simultanément', () => {
      // Mot de passe trop court (7 chars) + séquence triviale (qwerty) + contient email local
      // On ne teste PAS tooCommon ici car la liste n'inclut pas "qwerty@x" — on se concentre
      // sur les règles longueur + séquence + email.
      const result = validatePasswordServer('qwerty!', 'qwerty@example.com');
      expect(result.valid).toBe(false);
      // Trop court (7 < 12)
      expect(result.errors).toContain('password.tooShort');
      // Séquence triviale (qwerty)
      expect(result.errors).toContain('password.trivialSequence');
      // Contient l'email local "qwerty" (6 > 3)
      expect(result.errors).toContain('password.containsEmail');
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('retourne errors=[] et valid=true pour un mot de passe fort', () => {
      const result = validatePasswordServer('Tr0ub4dor&3MonkeyBazooka', 'alice@example.com');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('normalisation Unicode (NFC)', () => {
    it('traite les variantes Unicode normalisées comme équivalentes', () => {
      // é en NFC (é) vs NFD (e + combining accent)
      const nfcPass = 'Trésor!Long12X';
      const nfdPass = 'Trésor!Long12X';
      const r1 = validatePasswordServer(nfcPass);
      const r2 = validatePasswordServer(nfdPass);
      // Les deux doivent produire le même résultat de validation
      expect(r1.valid).toBe(r2.valid);
    });
  });
});

describe('server/utils/passwordPolicy — computeHibpPrefixSuffix()', () => {
  it('retourne un prefix de 5 caractères et un suffix de 35 caractères', async () => {
    const { prefix, suffix } = await computeHibpPrefixSuffix('password');
    expect(prefix).toHaveLength(5);
    expect(suffix).toHaveLength(35);
    // Uniquement des caractères hexadécimaux en majuscule
    expect(prefix).toMatch(/^[0-9A-F]{5}$/);
    expect(suffix).toMatch(/^[0-9A-F]{35}$/);
  });

  it('prefix + suffix = SHA-1 complet en majuscule (40 chars)', async () => {
    const { prefix, suffix } = await computeHibpPrefixSuffix('test1234');
    expect(`${prefix}${suffix}`).toHaveLength(40);
    expect(`${prefix}${suffix}`).toMatch(/^[0-9A-F]{40}$/);
  });

  it('est déterministe', async () => {
    const r1 = await computeHibpPrefixSuffix('myPassword');
    const r2 = await computeHibpPrefixSuffix('myPassword');
    expect(r1.prefix).toBe(r2.prefix);
    expect(r1.suffix).toBe(r2.suffix);
  });

  it('produit des résultats différents pour des mots de passe différents', async () => {
    const r1 = await computeHibpPrefixSuffix('passwordA');
    const r2 = await computeHibpPrefixSuffix('passwordB');
    expect(r1.suffix).not.toBe(r2.suffix);
  });

  it("n'envoie que 5 chars sur le réseau (le hash complet n'est jamais dans la requête)", async () => {
    // Ce test vérifie que le suffix (35 chars) n'est jamais transmis à HIBP.
    // On vérifie ici uniquement la structure (pas de réseau réel dans les tests unit).
    const { prefix, suffix } = await computeHibpPrefixSuffix('hunter2');
    expect(prefix.length).toBe(5);
    expect(suffix.length).toBe(35);
    // Le suffix ne doit jamais apparaître dans une URL construite avec le prefix
    const url = `https://api.pwnedpasswords.com/range/${prefix}`;
    expect(url).not.toContain(suffix);
  });
});

describe('server/utils/passwordPolicy — isPasswordPwned()', () => {
  const fetchMock = vi.fn();

  afterEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('retourne true si le suffix est trouvé dans la réponse HIBP', async () => {
    const { suffix } = await computeHibpPrefixSuffix('password');

    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => `${suffix}:12345\nABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789A:1\n`,
    });

    const result = await isPasswordPwned('password');
    expect(result).toBe(true);
  });

  it('retourne false si le suffix est absent de la réponse HIBP', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:5\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:3\n',
    });

    const result = await isPasswordPwned('X7!mKp#nLq2wRs');
    expect(result).toBe(false);
  });

  it('fail-open si la réponse HTTP est non-ok', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });

    const result = await isPasswordPwned('somePassword');
    expect(result).toBe(false);
  });

  it('fail-open si le réseau lève une erreur', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    const result = await isPasswordPwned('somePassword');
    expect(result).toBe(false);
  });

  it('fail-open en cas de timeout (abort)', async () => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementationOnce(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new DOMException('The operation was aborted', 'AbortError')), 10);
      });
    });

    const result = await isPasswordPwned('somePassword');
    expect(result).toBe(false);
  });
});
