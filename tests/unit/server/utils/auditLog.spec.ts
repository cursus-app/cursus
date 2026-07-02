// @vitest-environment node
//
// Tests unitaires pour server/utils/auditLog.ts — ST-08.4

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuditEntry, sanitizeDiff, extractIp, maskIp } from '~~/server/utils/auditLog';

const { mockPrismaAuditLogCreate, mockLoggerInfo, mockLoggerError } = vi.hoisted(() => ({
  mockPrismaAuditLogCreate: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock('~~/server/utils/prisma', () => ({
  prisma: {
    auditLog: { create: mockPrismaAuditLogCreate },
  },
}));

vi.mock('~~/server/utils/logger', () => ({
  logger: { info: mockLoggerInfo, warn: vi.fn(), error: mockLoggerError },
}));

vi.mock('~~/server/utils/hash', () => ({
  hashId: (id: string) => `hashed:${id}`,
}));

describe('createAuditEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an audit log entry with all fields', async () => {
    mockPrismaAuditLogCreate.mockResolvedValue({ id: 'audit-uuid' });

    await createAuditEntry({
      actorId: 'actor-uuid',
      action: 'submission.override.validate',
      entityType: 'Submission',
      entityId: 'submission-uuid',
      diff: { before: 'PENDING', after: 'VALIDATED_OVERRIDE' },
      metadata: { reason: 'Good work' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0',
    });

    expect(mockPrismaAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'submission.override.validate',
          entityType: 'Submission',
          entityId: 'submission-uuid',
          userAgent: 'Mozilla/5.0',
        }),
      }),
    );
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'submission.override.validate' }),
      'audit.entry_created',
    );
  });

  it('masks IPv4 addresses (last octet)', async () => {
    mockPrismaAuditLogCreate.mockResolvedValue({ id: 'audit-uuid' });

    await createAuditEntry({
      actorId: null,
      action: 'auth.login_failed',
      entityType: 'User',
      ipAddress: '10.0.0.42',
    });

    expect(mockPrismaAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ipAddress: '10.0.0.0' }),
      }),
    );
  });

  it('masks IPv6 addresses (last 4 groups)', async () => {
    mockPrismaAuditLogCreate.mockResolvedValue({ id: 'audit-uuid' });

    await createAuditEntry({
      actorId: null,
      action: 'auth.login_failed',
      entityType: 'User',
      ipAddress: '2001:db8:85a3:0:0:8a2e:370:7334',
    });

    expect(mockPrismaAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ipAddress: '2001:db8:85a3:0:0:0:0:0' }),
      }),
    );
  });

  it('logs error but does not throw when prisma fails', async () => {
    mockPrismaAuditLogCreate.mockRejectedValue(new Error('DB connection lost'));

    await expect(
      createAuditEntry({
        actorId: 'actor-uuid',
        action: 'user.created',
        entityType: 'User',
      }),
    ).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.created' }),
      'audit.entry_create_failed',
    );
  });

  it('allows null actorId for system actions', async () => {
    mockPrismaAuditLogCreate.mockResolvedValue({ id: 'audit-uuid' });

    await createAuditEntry({
      actorId: null,
      action: 'certificate.issued',
      entityType: 'Certificate',
    });

    expect(mockPrismaAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actorId: null }),
      }),
    );
  });
});

describe('sanitizeDiff', () => {
  it('redacts password fields', () => {
    const result = sanitizeDiff({ password: 'secret123', name: 'Alice' });
    expect(result).toEqual({ password: '[REDACTED]', name: 'Alice' });
  });

  it('redacts token fields', () => {
    const result = sanitizeDiff({ token: 'abc.def.ghi', userId: 'uuid-123' });
    expect(result).toEqual({ token: '[REDACTED]', userId: 'uuid-123' });
  });

  it('hashes email fields', () => {
    const result = sanitizeDiff({ email: 'alice@example.com', role: 'ADMIN' });
    expect(result).toEqual({ email: 'hashed:alice@example.com', role: 'ADMIN' });
  });

  it('passes through non-sensitive fields unchanged', () => {
    const result = sanitizeDiff({ action: 'override', reason: 'Good work', count: 5 });
    expect(result).toEqual({ action: 'override', reason: 'Good work', count: 5 });
  });

  it('redacts accessToken and refreshToken', () => {
    const result = sanitizeDiff({ accessToken: 'tok1', refreshToken: 'tok2' });
    expect(result).toEqual({ accessToken: '[REDACTED]', refreshToken: '[REDACTED]' });
  });

  it('sanitizes nested objects recursively', () => {
    const result = sanitizeDiff({
      user: { email: 'x@y.com', password: 'secret', name: 'Alice' },
    });
    expect(result).toEqual({
      user: { email: 'hashed:x@y.com', password: '[REDACTED]', name: 'Alice' },
    });
  });

  it('sanitizes objects inside arrays', () => {
    const result = sanitizeDiff({
      users: [{ email: 'x@y.com', password: 'secret', name: 'Alice' }],
    });
    expect(result).toEqual({
      users: [{ email: 'hashed:x@y.com', password: '[REDACTED]', name: 'Alice' }],
    });
  });
});

describe('maskIp', () => {
  it('masks the last octet of an IPv4 address', () => {
    expect(maskIp('192.168.1.100')).toBe('192.168.1.0');
  });

  it('masks the last 4 groups of a full IPv6 address', () => {
    expect(maskIp('2001:db8:85a3:0:0:8a2e:370:7334')).toBe('2001:db8:85a3:0:0:0:0:0');
  });

  it('masks a compressed IPv6 address (loopback ::1)', () => {
    expect(maskIp('::1')).toBe('0:0:0:0:0:0:0:0');
  });

  it('masks a compressed IPv6 address (2001:db8::1)', () => {
    expect(maskIp('2001:db8::1')).toBe('2001:db8:0:0:0:0:0:0');
  });
});

describe('extractIp', () => {
  it('extracts IP from X-Forwarded-For header (string)', () => {
    const event = {
      node: { req: { headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } } },
    };
    expect(extractIp(event as Parameters<typeof extractIp>[0])).toBe('1.2.3.4');
  });

  it('extracts IP from X-Forwarded-For header (array)', () => {
    const event = {
      node: { req: { headers: { 'x-forwarded-for': ['5.6.7.8', '10.0.0.1'] } } },
    };
    expect(extractIp(event as Parameters<typeof extractIp>[0])).toBe('5.6.7.8');
  });

  it('falls back to socket remoteAddress', () => {
    const event = {
      node: {
        req: {
          headers: {},
          socket: { remoteAddress: '127.0.0.1' },
        },
      },
    };
    expect(extractIp(event as Parameters<typeof extractIp>[0])).toBe('127.0.0.1');
  });

  it('returns null if no IP available', () => {
    const event = { node: { req: { headers: {} } } };
    expect(extractIp(event as Parameters<typeof extractIp>[0])).toBeNull();
  });
});
