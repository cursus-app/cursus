// @vitest-environment node
//
// Tests unitaires pour server/utils/ogScraper.ts (ST-03.3).
// Couvre : protection SSRF, DNS rebinding, parsing OG, timeout, sanitization.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isBlockedHost,
  assertNotPrivateUrl,
  parseOgFromHtml,
  scrapeOgMetadata,
} from '~~/server/utils/ogScraper';

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock node:dns so tests don't make real DNS lookups.
// Default: any hostname resolves to a public IP (1.2.3.4, family 4).
// Individual tests may override via mockDnsLookup.mockResolvedValueOnce().
//
// vi.hoisted() is required here so the function reference is available at
// module evaluation time — vi.mock() factories are hoisted before import
// statements, so a plain `const mockDnsLookup = vi.fn()` would not yet be
// initialised when the factory runs.
const mockDnsLookup = vi.hoisted(() => vi.fn());
vi.mock('node:dns', () => ({
  promises: {
    lookup: mockDnsLookup,
  },
}));

// ─── isBlockedHost ────────────────────────────────────────────────────────────

describe('isBlockedHost — SSRF protection', () => {
  it('blocks localhost', () => {
    expect(isBlockedHost('localhost')).toBe(true);
    expect(isBlockedHost('LOCALHOST')).toBe(true);
  });

  it('blocks 127.x.x.x (loopback)', () => {
    expect(isBlockedHost('127.0.0.1')).toBe(true);
    expect(isBlockedHost('127.255.255.255')).toBe(true);
  });

  it('blocks 10.x.x.x (RFC 1918)', () => {
    expect(isBlockedHost('10.0.0.1')).toBe(true);
    expect(isBlockedHost('10.255.255.255')).toBe(true);
  });

  it('blocks 172.16-31.x.x (RFC 1918)', () => {
    expect(isBlockedHost('172.16.0.1')).toBe(true);
    expect(isBlockedHost('172.31.255.255')).toBe(true);
    expect(isBlockedHost('172.32.0.1')).toBe(false); // outside range
    expect(isBlockedHost('172.15.0.1')).toBe(false); // outside range
  });

  it('blocks 192.168.x.x (RFC 1918)', () => {
    expect(isBlockedHost('192.168.0.1')).toBe(true);
    expect(isBlockedHost('192.168.255.255')).toBe(true);
  });

  it('blocks 169.254.x.x (link-local, AWS metadata)', () => {
    expect(isBlockedHost('169.254.169.254')).toBe(true);
    expect(isBlockedHost('169.254.0.1')).toBe(true);
  });

  it('blocks IPv6 loopback ::1', () => {
    expect(isBlockedHost('::1')).toBe(true);
  });

  it('blocks IPv6 link-local fe80::', () => {
    expect(isBlockedHost('fe80::1')).toBe(true);
    expect(isBlockedHost('FE80::1')).toBe(true);
  });

  it('blocks 0.0.0.0', () => {
    expect(isBlockedHost('0.0.0.0')).toBe(true);
  });

  it('allows public hostnames', () => {
    expect(isBlockedHost('example.com')).toBe(false);
    expect(isBlockedHost('developer.mozilla.org')).toBe(false);
    expect(isBlockedHost('8.8.8.8')).toBe(false); // public IP (Google DNS)
    expect(isBlockedHost('1.1.1.1')).toBe(false); // Cloudflare DNS
  });

  it('handles IPv6 with brackets (stripped by isBlockedHost itself)', () => {
    // isBlockedHost strips brackets ([::1] → ::1) before pattern matching
    expect(isBlockedHost('[::1]')).toBe(true);
  });
});

// ─── assertNotPrivateUrl ──────────────────────────────────────────────────────

describe('assertNotPrivateUrl — URL-level SSRF protection', () => {
  it('throws for http://localhost', () => {
    expect(() => assertNotPrivateUrl('http://localhost')).toThrow(/SSRF|privée/);
  });

  it('throws for http://127.0.0.1', () => {
    expect(() => assertNotPrivateUrl('http://127.0.0.1')).toThrow(/SSRF|privée/);
  });

  it('throws for http://10.0.0.1', () => {
    expect(() => assertNotPrivateUrl('http://10.0.0.1')).toThrow(/SSRF|privée/);
  });

  it('throws for http://169.254.169.254 (AWS metadata)', () => {
    expect(() => assertNotPrivateUrl('http://169.254.169.254')).toThrow(/SSRF|privée/);
  });

  it('throws for file:// protocol', () => {
    expect(() => assertNotPrivateUrl('file:///etc/passwd')).toThrow(/autorisés/);
  });

  it('throws for ftp:// protocol', () => {
    expect(() => assertNotPrivateUrl('ftp://example.com')).toThrow(/autorisés/);
  });

  it('throws for invalid URL', () => {
    expect(() => assertNotPrivateUrl('not-a-url')).toThrow(/invalide/i);
  });

  it('allows https://developer.mozilla.org', () => {
    expect(() => assertNotPrivateUrl('https://developer.mozilla.org')).not.toThrow();
  });

  it('allows http://freecodecamp.org', () => {
    expect(() => assertNotPrivateUrl('http://freecodecamp.org')).not.toThrow();
  });
});

// ─── parseOgFromHtml ─────────────────────────────────────────────────────────

describe('parseOgFromHtml — OG metadata parser', () => {
  it('extracts og:title, og:image, og:description', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="MDN JavaScript" />
          <meta property="og:image" content="https://developer.mozilla.org/og.png" />
          <meta property="og:description" content="The JavaScript reference guide." />
        </head>
      </html>
    `;
    const result = parseOgFromHtml(html, 'https://developer.mozilla.org');
    expect(result.title).toBe('MDN JavaScript');
    expect(result.image).toBe('https://developer.mozilla.org/og.png');
    expect(result.description).toBe('The JavaScript reference guide.');
  });

  it('falls back to <title> tag when og:title is missing', () => {
    const html = `
      <html>
        <head>
          <title>Page Title from HTML</title>
        </head>
      </html>
    `;
    const result = parseOgFromHtml(html, 'https://example.com');
    expect(result.title).toBe('Page Title from HTML');
    expect(result.image).toBeNull();
    expect(result.description).toBeNull();
  });

  it('prefers og:title over <title>', () => {
    const html = `
      <html>
        <head>
          <title>HTML Title</title>
          <meta property="og:title" content="OG Title" />
        </head>
      </html>
    `;
    const result = parseOgFromHtml(html, 'https://example.com');
    expect(result.title).toBe('OG Title');
  });

  it('resolves relative og:image URL against page URL', () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="/images/preview.jpg" />
        </head>
      </html>
    `;
    const result = parseOgFromHtml(html, 'https://example.com/page');
    expect(result.image).toBe('https://example.com/images/preview.jpg');
  });

  it('returns null for all fields when no OG data and no title', () => {
    const html = '<html><body>No metadata here.</body></html>';
    const result = parseOgFromHtml(html, 'https://example.com');
    expect(result.title).toBeNull();
    expect(result.image).toBeNull();
    expect(result.description).toBeNull();
  });

  it('sanitizes HTML tags in og:title to prevent XSS', () => {
    // Note: use double-quoted content to avoid the regex stopping at single quotes
    const html = `
      <html>
        <head>
          <meta property="og:title" content="&lt;script&gt;alert(xss)&lt;/script&gt;Safe Title" />
        </head>
      </html>
    `;
    const result = parseOgFromHtml(html, 'https://example.com');
    // HTML entities in the attribute are parsed by the meta extractor as-is (no HTML parsing),
    // then sanitizeOgValue decodes them and strips any remaining tags
    expect(result.title).not.toContain('<script>');
    expect(result.title).toContain('Safe Title');
  });

  it('handles meta tags with content before property (alternate attribute order)', () => {
    const html = `
      <html>
        <head>
          <meta content="Reversed Order Title" property="og:title" />
        </head>
      </html>
    `;
    const result = parseOgFromHtml(html, 'https://example.com');
    expect(result.title).toBe('Reversed Order Title');
  });

  it('handles og:image URL that cannot be resolved', () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="not-a-valid-url-at-all://bad" />
        </head>
      </html>
    `;
    const result = parseOgFromHtml(html, 'https://example.com');
    // Invalid image URLs are discarded
    expect(result.image).toBeNull();
  });
});

// ─── scrapeOgMetadata ─────────────────────────────────────────────────────────

describe('scrapeOgMetadata — full scrape with SSRF + timeout + DNS rebinding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: hostname resolves to a safe public IP so existing tests are unaffected.
    mockDnsLookup.mockResolvedValue({ address: '1.2.3.4', family: 4 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws SSRF error for internal URLs', async () => {
    await expect(scrapeOgMetadata('http://localhost:8080')).rejects.toThrow(/SSRF|privée/);
  });

  it('throws SSRF error for 10.x IP', async () => {
    await expect(scrapeOgMetadata('http://10.0.0.1/secret')).rejects.toThrow(/SSRF|privée/);
  });

  it('throws for AWS metadata endpoint', async () => {
    await expect(scrapeOgMetadata('http://169.254.169.254/latest/meta-data')).rejects.toThrow(
      /SSRF|privée/,
    );
  });

  it('throws for protocol other than http/https', async () => {
    await expect(scrapeOgMetadata('ftp://example.com')).rejects.toThrow(/autorisés/);
  });

  it('blocks DNS rebinding: public hostname resolving to AWS metadata IP 169.254.169.254', async () => {
    // Simulate DNS rebinding attack: evil.attacker.com initially returns a public IP
    // (passes the string-level SSRF check), but by the time we resolve it, DNS has
    // been flipped to the AWS metadata endpoint.
    mockDnsLookup.mockResolvedValueOnce({ address: '169.254.169.254', family: 4 });

    await expect(scrapeOgMetadata('https://evil.attacker.com/path')).rejects.toThrow(
      /SSRF|privée/,
    );
  });

  it('blocks DNS rebinding: public hostname resolving to RFC-1918 10.x address', async () => {
    mockDnsLookup.mockResolvedValueOnce({ address: '10.0.0.1', family: 4 });

    await expect(scrapeOgMetadata('https://evil.attacker.com/internal')).rejects.toThrow(
      /SSRF|privée/,
    );
  });

  it('blocks DNS rebinding: public hostname resolving to loopback 127.0.0.1', async () => {
    mockDnsLookup.mockResolvedValueOnce({ address: '127.0.0.1', family: 4 });

    await expect(scrapeOgMetadata('https://legit-looking.com')).rejects.toThrow(/SSRF|privée/);
  });

  it('throws when DNS resolution itself fails (fail-closed)', async () => {
    mockDnsLookup.mockRejectedValueOnce(new Error('ENOTFOUND nonexistent.invalid'));

    await expect(scrapeOgMetadata('https://nonexistent.invalid')).rejects.toThrow(
      /résoudre|domaine/i,
    );
  });

  it('returns OG metadata for a successful public URL fetch', async () => {
    const mockHtml = `
      <html>
        <head>
          <title>Test Page</title>
          <meta property="og:title" content="Mocked OG Title" />
          <meta property="og:description" content="Mocked description." />
        </head>
      </html>
    `;

    const mockReader = {
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(mockHtml),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      cancel: vi.fn(),
    };

    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      url: 'https://example.com/page',
      headers: new Map([['content-type', 'text/html; charset=utf-8']]),
      body: { getReader: () => mockReader },
    };
    mockResponse.headers.get = (key: string) => mockResponse.headers.get(key);

    // Mock headers.get method
    const headersMap = new Map([['content-type', 'text/html; charset=utf-8']]);
    const mockResponseWithHeaders = {
      ...mockResponse,
      headers: { get: (key: string) => headersMap.get(key) ?? null },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockResponseWithHeaders as unknown as Response,
    );

    const result = await scrapeOgMetadata('https://example.com/page');
    expect(result.title).toBe('Mocked OG Title');
    expect(result.description).toBe('Mocked description.');
    expect(result.url).toBe('https://example.com/page');
  });

  it('throws on HTTP error response (404)', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      url: 'https://example.com/missing',
      headers: { get: () => 'text/html' },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

    await expect(scrapeOgMetadata('https://example.com/missing')).rejects.toThrow(/404/);
  });

  it('throws timeout error when fetch takes too long', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          // Simulate the AbortController signal aborting
          const signal = (options as RequestInit)?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted.');
              err.name = 'AbortError';
              reject(err);
            });
          }
          // Immediately trigger abort by letting the timeout fire
          setTimeout(() => {
            const err = new Error('The operation was aborted.');
            err.name = 'AbortError';
            reject(err);
          }, 0);
        }),
    );

    await expect(scrapeOgMetadata('https://example.com')).rejects.toThrow(
      /timeout|lent|inaccessible/i,
    );
  });

  it('returns null image/description for non-HTML content-type', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      url: 'https://example.com/doc.pdf',
      headers: { get: (key: string) => (key === 'content-type' ? 'application/pdf' : null) },
      body: null,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse as unknown as Response);

    const result = await scrapeOgMetadata('https://example.com/doc.pdf');
    expect(result.title).toBeNull();
    expect(result.image).toBeNull();
    expect(result.description).toBeNull();
  });
});
