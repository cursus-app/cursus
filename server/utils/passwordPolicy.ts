// Helper de politique de mot de passe — côté serveur uniquement.
// Cf. ST-15.4 TT-15.4.1 + TT-15.4.2.
//
// Règles :
//  - Minimum 12 caractères
//  - Pas dans la liste des mots de passe communs embarquée (top ~200)
//  - Pas l'email (comparaison case-insensitive sur la partie locale)
//  - Pas de séquences triviales clavier/numériques
//  - NFC normalization pour stabilité Unicode (NIST SP 800-63B)

// ---------------------------------------------------------------------------
// Liste des ~200 mots de passe les plus communs (source : SecLists top-500)
// Embarquée pour éviter toute dépendance réseau synchrone.
// ---------------------------------------------------------------------------
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'password1234', 'password12345',
  '123456789', '1234567890', '12345678', '123456789012',
  'qwerty123', 'qwerty1234', 'qwertyuiop', 'qwertyuiop123',
  'azerty', 'azertyuiop', 'azerty123', 'azertyuiop123',
  'iloveyou', 'iloveyou1', 'iloveyou12',
  'admin', 'admin123', 'admin1234', 'administrator',
  'welcome', 'welcome1', 'welcome123',
  'monkey', 'monkey123',
  'login', 'login123',
  'abc123', 'abc1234', 'abc12345',
  'starwars', 'starwars1',
  'dragon', 'dragon123',
  'master', 'master123',
  'letmein', 'letmein1', 'letmein123',
  'sunshine', 'sunshine1',
  'princess', 'princess1',
  'football', 'football1',
  'shadow', 'shadow123',
  'superman', 'superman1',
  'michael', 'michael1',
  'jessica', 'jessica1',
  'charlie', 'charlie1',
  'donald', 'donald123',
  'trustno1', 'trustno1!',
  'baseball', 'baseball1',
  'batman', 'batman123',
  'dragon1', 'dragon12',
  'hello123', 'hello1234',
  'hockey', 'hockey123',
  'hunter', 'hunter123',
  'mustang', 'mustang1',
  'ranger', 'ranger123',
  'soccer', 'soccer123',
  'thomas', 'thomas1',
  'tigger', 'tigger1',
  'zxcvbnm', 'zxcvbnm1',
  '1q2w3e4r', '1q2w3e4r5t',
  'qazwsx', 'qazwsxedc',
  'passw0rd', 'p@ssword', 'p@ssw0rd',
  'p@ssword1', 'p@ssword123',
  'changeme', 'changeme1', 'changeme123',
  'secret', 'secret123', 'secret1234',
  'test', 'test123', 'test1234',
  'user', 'user123', 'user1234',
  'guest', 'guest123',
  'access', 'access1', 'access123',
  'pepper', 'pepper123',
  'computer', 'computer1',
  'internet', 'internet1',
  'joshua', 'joshua1',
  'maggie', 'maggie1',
  'nothing', 'nothing1',
  'orange', 'orange1', 'orange123',
  'purple', 'purple1', 'purple123',
  'samantha', 'samantha1',
  'summer', 'summer1', 'summer123',
  'yankees', 'yankees1',
  'cheese', 'cheese1', 'cheese123',
  'buster', 'buster1',
  'chocolate', 'chocolate1',
  'cookie', 'cookie1', 'cookie123',
  'diamond', 'diamond1',
  'george', 'george1',
  'harley', 'harley1',
  'jennifer', 'jennifer1',
  'joseph', 'joseph1',
  'killer', 'killer1',
  'liberty', 'liberty1',
  'lucky', 'lucky1', 'lucky123',
  'magnum', 'magnum1',
  'melissa', 'melissa1',
  'minnie', 'minnie1',
  'passme', 'passme1',
  'phoenix', 'phoenix1',
  'pokemon', 'pokemon1', 'pokemon123',
  'poop', 'poop123',
  'qwerty12', 'qwerty1234',
  'roger', 'roger123',
  'russia', 'russia123',
  'snoopy', 'snoopy1',
  'squirt', 'squirt1',
  'stargate', 'stargate1',
  'steven', 'steven1',
  'success', 'success1',
  'super', 'super123',
  'sword', 'sword123',
  'system', 'system123',
  'target', 'target123',
  'thunder', 'thunder1',
  'towers', 'towers1',
  'trinity', 'trinity1',
  'trouble', 'trouble1',
  'turtle', 'turtle1',
  'umbrella', 'umbrella1',
  'united', 'united1',
  'victory', 'victory1',
  'vincent', 'vincent1',
  'winner', 'winner1',
  'winter', 'winter1', 'winter123',
  'wizard', 'wizard1',
  'wolves', 'wolves1',
  'yankee', 'yankee1',
  'yellow', 'yellow1', 'yellow123',
  'young', 'young123',
  'zorro', 'zorro1',
  // Mots courants français
  'bonjour', 'bonjour1', 'bonjour123',
  'soleil', 'soleil1', 'soleil123',
  'maison', 'maison1', 'maison123',
  'france', 'france1', 'france123',
  'paris', 'paris1', 'paris123',
  'amour', 'amour1', 'amour123',
  'motdepasse', 'motdepasse1', 'motdepasse123',
])

// ---------------------------------------------------------------------------
// Séquences triviales à détecter (clavier, numériques, alphabétiques)
// ---------------------------------------------------------------------------
const TRIVIAL_SEQUENCES = [
  '123456', '234567', '345678', '456789', '567890',
  '0987654', '9876543', '8765432',
  'abcdef', 'bcdefg', 'cdefgh',
  'zyxwvu', 'yxwvut',
  'qwerty', 'wertyu', 'ertyui', 'rtyuio', 'tyuiop',
  'qwertz', 'azerty',
  'asdfgh', 'sdfghj', 'dfghjk',
  'zxcvbn', 'xcvbnm',
  'aaaa', 'bbbb', 'cccc', 'dddd', 'eeee',
  'ffff', 'gggg', 'hhhh', 'iiii', 'jjjj',
  '0000', '1111', '2222', '3333', '4444',
  '5555', '6666', '7777', '8888', '9999',
]

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------

/**
 * Valide la force d'un mot de passe selon la politique Cursus (ST-15.4).
 *
 * @param password  Mot de passe à tester (en clair, jamais loggué).
 * @param email     Email de l'utilisateur pour détecter les inclusions contextuelles.
 * @returns         { valid, errors } — `errors` contient des clés i18n.
 *
 * Sécurité : NFC normalization avant tout check (NIST SP 800-63B §5.1.1.2).
 * PII : ne jamais passer `password` ou `email` à un logger.
 */
export function validatePasswordServer(password: string, email?: string): PasswordValidationResult {
  // NFC normalization pour stabilité Unicode
  const normalized = password.normalize('NFC')
  const lower = normalized.toLowerCase()
  const errors: string[] = []

  // Règle 1 : longueur minimale
  if (normalized.length < 12) {
    errors.push('password.tooShort')
  }

  // Règle 2 : mot de passe commun
  if (COMMON_PASSWORDS.has(lower)) {
    errors.push('password.tooCommon')
  }

  // Règle 3 : séquences triviales
  if (TRIVIAL_SEQUENCES.some((seq) => lower.includes(seq))) {
    errors.push('password.trivialSequence')
  }

  // Règle 4 : contient l'email (partie locale, case-insensitive)
  if (email) {
    const emailLocal = email.split('@')[0]?.toLowerCase().trim() ?? ''
    if (emailLocal.length > 3 && lower.includes(emailLocal)) {
      errors.push('password.containsEmail')
    }
  }

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// HaveIBeenPwned k-anonymity (TT-15.4.2)
// ---------------------------------------------------------------------------

/**
 * Calcule le SHA-1 d'un mot de passe pour la vérification k-anonymity HIBP.
 * On n'envoie que les 5 premiers caractères du hash — jamais le mot de passe
 * ni le hash complet.
 *
 * @returns sha1Prefix (5 chars) + sha1Suffix (35 chars)
 */
export async function computeHibpPrefixSuffix(
  password: string,
): Promise<{ prefix: string; suffix: string }> {
  const { createHash } = await import('node:crypto')
  const hash = createHash('sha1')
    .update(password.normalize('NFC'), 'utf8')
    .digest('hex')
    .toUpperCase()
  return {
    prefix: hash.slice(0, 5),
    suffix: hash.slice(5),
  }
}

/**
 * Vérifie si le mot de passe a été compromis via l'API HaveIBeenPwned k-anonymity.
 * Timeout 1.5s — en cas d'échec (réseau, timeout), on fail-open (on ne bloque pas).
 *
 * @returns true si compromis, false si sûr ou si l'API est indisponible.
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  const { prefix, suffix } = await computeHibpPrefixSuffix(password)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1_500)

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
      headers: { 'Add-Padding': 'true' },
    })

    if (!response.ok) {
      // Fail-open : ne pas bloquer l'utilisateur si HIBP est indisponible
      return false
    }

    const text = await response.text()
    // Chaque ligne : "<SUFFIX>:<count>"
    const lines = text.split('\n')
    return lines.some((line) => {
      const [lineSuffix] = line.split(':')
      return lineSuffix?.trim().toUpperCase() === suffix
    })
  } catch {
    // Timeout ou erreur réseau → fail-open
    return false
  } finally {
    clearTimeout(timeout)
  }
}
