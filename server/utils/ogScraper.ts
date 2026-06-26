/**
 * OG Scraper — récupère les métadonnées Open Graph d'une URL.
 *
 * Protections :
 *  - SSRF : rejette les IPs privées/loopback/link-local (RFC 1918 + RFC 3927 + AWS metadata).
 *  - Timeout : 10s max sur le fetch.
 *  - Sanitization : sanitize les valeurs OG avant de les retourner.
 *
 * Cf. ST-03.3 TT-03.3.2.
 */
import { logger } from '~~/server/utils/logger';

// ─── SSRF protection ─────────────────────────────────────────────────────────

/**
 * Patterns d'hôtes bloqués pour la protection SSRF.
 * On bloque :
 *  - localhost / loopback (127.x.x.x, ::1)
 *  - RFC 1918 (10.x, 172.16-31.x, 192.168.x)
 *  - RFC 3927 link-local (169.254.x)
 *  - AWS metadata endpoint (169.254.169.254)
 *  - IPv6 link-local (fe80::)
 *  - IANA special-purpose (240.0.0.0/4, 0.0.0.0)
 */
const BLOCKED_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^::1$/,
  /^fe80:/i,
  /^0\.0\.0\.0$/,
  /^240\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
];

/**
 * Vérifie si un hostname est une adresse privée ou interne (protection SSRF).
 * @returns true si l'host est bloqué
 */
export function isBlockedHost(hostname: string): boolean {
  const normalised = hostname.toLowerCase().trim();
  // Remove brackets from IPv6 addresses (e.g. [::1] → ::1)
  const cleaned = normalised.replace(/^\[|\]$/g, '');
  return BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(cleaned));
}

/**
 * Valide que l'URL ne pointe pas vers une ressource interne.
 * Lance une erreur si l'URL est bloquée.
 */
export function assertNotPrivateUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('URL invalide');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Seuls les protocoles http:// et https:// sont autorisés');
  }

  if (isBlockedHost(parsed.hostname)) {
    throw new Error('URL interne ou privée — rejetée pour des raisons de sécurité (SSRF)');
  }
}

// ─── OG parser ───────────────────────────────────────────────────────────────

/** Sanitize une valeur OG pour prévenir XSS. */
function sanitizeOgValue(value: string | null): string | null {
  if (value === null) { return null; }
  // 1. Decode HTML entities first (to catch encoded tags like &lt;script&gt;)
  // 2. Then strip all HTML tags from the decoded text
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Strip any HTML tags (including ones revealed by entity decoding)
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 1000);
}

/** Extrait le contenu d'une balise meta par property ou name. */
function extractMetaContent(html: string, property: string): string | null {
  // Match <meta property="og:xxx" content="..." />
  const propRegex = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${property}["'][^>]+content\\s*=\\s*["']([^"']*?)["']`,
    'i',
  );
  const contentFirstRegex = new RegExp(
    `<meta[^>]+content\\s*=\\s*["']([^"']*?)["'][^>]+(?:property|name)\\s*=\\s*["']${property}["']`,
    'i',
  );

  const match = propRegex.exec(html) ?? contentFirstRegex.exec(html);
  return match?.[1] ?? null;
}

/** Extrait le contenu de la balise <title>. */
function extractTitle(html: string): string | null {
  const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return match?.[1] ?? null;
}

export interface OgResult {
  url: string;
  title: string | null;
  image: string | null;
  description: string | null;
}

/**
 * Parse les métadonnées Open Graph depuis le HTML d'une page.
 * Fallback sur `<title>` si og:title est absent.
 */
export function parseOgFromHtml(html: string, pageUrl: string): OgResult {
  const ogTitle = extractMetaContent(html, 'og:title');
  const ogImage = extractMetaContent(html, 'og:image');
  const ogDescription = extractMetaContent(html, 'og:description');
  const titleTag = extractTitle(html);

  let imageUrl: string | null = null;
  if (ogImage) {
    try {
      // Resolve relative URLs and validate protocol
      const resolved = new URL(ogImage, pageUrl);
      if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        imageUrl = resolved.href;
      }
    } catch {
      imageUrl = null;
    }
  }

  return {
    url: pageUrl,
    title: sanitizeOgValue(ogTitle ?? titleTag),
    image: imageUrl,
    description: sanitizeOgValue(ogDescription),
  };
}

// ─── Main scraper ─────────────────────────────────────────────────────────────

const OG_FETCH_TIMEOUT_MS = 10_000;

/**
 * Scrape les métadonnées OG d'une URL externe.
 *
 * @throws Error si l'URL est une adresse privée (SSRF)
 * @throws Error si le site est lent ou inaccessible (timeout > 10s)
 * @throws Error si la réponse HTTP n'est pas 2xx
 */
export async function scrapeOgMetadata(rawUrl: string): Promise<OgResult> {
  assertNotPrivateUrl(rawUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        // Appear as a regular browser to avoid bot-detection blocking OG fetches
        'User-Agent':
          'Mozilla/5.0 (compatible; CursusBot/1.0; +https://cursus.dev/bot) Googlebot/2.1',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr,en;q=0.9',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    // Guard against redirect chains that land on a private/internal host
    assertNotPrivateUrl(response.url);

    if (!response.ok) {
      throw new Error(`Le serveur a répondu ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      // Non-HTML resource (PDF, video…): return URL as title only
      return { url: response.url, title: null, image: null, description: null };
    }

    // Limit to first 100 KB to avoid parsing huge pages
    const reader = response.body?.getReader();
    if (!reader) {
      return { url: response.url, title: null, image: null, description: null };
    }

    let htmlChunk = '';
    let totalBytes = 0;
    const MAX_BYTES = 100_000;

    let streaming = true;
    while (streaming) {
      const { done, value } = await reader.read();
      if (done) {
        streaming = false;
      } else {
        totalBytes += value.byteLength;
        htmlChunk += new TextDecoder().decode(value, { stream: true });
        // Stop once we have enough to extract OG tags (they're in <head>)
        if (totalBytes >= MAX_BYTES) {
          await reader.cancel();
          streaming = false;
        }
      }
    }

    return parseOgFromHtml(htmlChunk, response.url);
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === 'AbortError') {
      logger.warn({ url: rawUrl }, 'resource.og.scraping_error — timeout');
      throw new Error('Site lent ou inaccessible (timeout > 10s)', { cause: err });
    }

    logger.warn({ url: rawUrl, message: err instanceof Error ? err.message : String(err) }, 'resource.og.scraping_error');
    throw new Error(err instanceof Error ? err.message : String(err), { cause: err });
  }
}
