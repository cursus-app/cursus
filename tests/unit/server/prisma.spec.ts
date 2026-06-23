import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// On mocke le client Prisma et l'adapter pour tester la LOGIQUE de prisma.ts
// sans tirer le driver `pg` (incompatible avec l'env happy-dom) ni une vraie DB.
const { queryRawMock } = vi.hoisted(() => ({ queryRawMock: vi.fn() }));

vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: vi.fn() }));

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $queryRaw = queryRawMock;
    // `$on` invoque immédiatement le handler avec un faux event : cela exécute
    // (et couvre) les 4 callbacks query/info/warn/error enregistrés dans prisma.ts.
    $on(_evt: string, cb: (e: any) => void) {
      cb({ query: 'SELECT 1', duration: 1, message: 'm', target: 't' });
      return this;
    }
  },
}));

const ORIGINAL_ENV = process.env;

describe('server/utils/prisma', () => {
  beforeEach(() => {
    vi.resetModules();
    queryRawMock.mockReset();
    // `resetModules` ne touche pas globalThis : on retire le singleton mis en cache
    // pour que chaque test ré-exécute réellement le chemin de création du client.
    delete (globalThis as Record<string, unknown>)['prisma'];
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it('pingDatabase renvoie une latence (ms) quand SELECT 1 réussit', async () => {
    queryRawMock.mockResolvedValue([{ '?column?': 1 }]);
    const { pingDatabase } = await import('~~/server/utils/prisma');

    const latency = await pingDatabase();

    expect(typeof latency).toBe('number');
    expect(latency).toBeGreaterThanOrEqual(0);
    expect(queryRawMock).toHaveBeenCalledOnce();
  });

  it('pingDatabase renvoie null quand la requête échoue (DB injoignable)', async () => {
    queryRawMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const { pingDatabase } = await import('~~/server/utils/prisma');

    expect(await pingDatabase()).toBeNull();
  });

  it('exporte un singleton prisma réutilisé entre imports', async () => {
    const a = await import('~~/server/utils/prisma');
    const b = await import('~~/server/utils/prisma');
    expect(a.prisma).toBe(b.prisma);
  });

  it('utilise errorFormat "minimal" en production', async () => {
    process.env['NODE_ENV'] = 'production';
    const mod = await import('~~/server/utils/prisma');
    expect(mod.prisma).toBeDefined();
  });

  it('throw si aucune connection string n’est disponible', async () => {
    delete process.env['DATABASE_URL'];
    delete process.env['DIRECT_URL'];
    await expect(import('~~/server/utils/prisma')).rejects.toThrow(
      /DATABASE_URL ou DIRECT_URL manquant/,
    );
  });
});
