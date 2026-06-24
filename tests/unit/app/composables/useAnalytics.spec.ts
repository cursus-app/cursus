// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalytics } from '~/composables/useAnalytics';

type PlausibleFn = (event: string, opts?: { props?: Record<string, unknown> }) => void;

const mockPlausible = vi.fn<PlausibleFn>();

function withPlausible(fn: () => void) {
  Object.defineProperty(window, 'plausible', {
    value: mockPlausible,
    writable: true,
    configurable: true,
  });
  fn();
   
  delete (window as Window & { plausible?: PlausibleFn }).plausible;
}

function setDnt(value: string | null) {
  Object.defineProperty(navigator, 'doNotTrack', {
    value,
    writable: true,
    configurable: true,
  });
}

describe('useAnalytics', () => {
  beforeEach(() => {
    mockPlausible.mockClear();
    setDnt(null);
  });

  it('appelle window.plausible avec le bon event', () => {
    withPlausible(() => {
      const { track } = useAnalytics();
      track('signup_started');
      expect(mockPlausible).toHaveBeenCalledWith('signup_started', undefined);
    });
  });

  it('passe les props à window.plausible', () => {
    withPlausible(() => {
      const { track } = useAnalytics();
      track('harness_validated', { module_id: 'mod-1', attempt_n: 2 });
      expect(mockPlausible).toHaveBeenCalledWith('harness_validated', {
        props: { module_id: 'mod-1', attempt_n: 2 },
      });
    });
  });

  it('ne fait rien si window.plausible est absent', () => {
    const { track } = useAnalytics();
    expect(() => track('certificate_issued')).not.toThrow();
    expect(mockPlausible).not.toHaveBeenCalled();
  });

  it('respecte DNT=1 : ne track pas', () => {
    setDnt('1');
    withPlausible(() => {
      const { track } = useAnalytics();
      track('signup_completed');
      expect(mockPlausible).not.toHaveBeenCalled();
    });
  });

  it('track normalement si DNT=0', () => {
    setDnt('0');
    withPlausible(() => {
      const { track } = useAnalytics();
      track('capstone_submitted');
      expect(mockPlausible).toHaveBeenCalledWith('capstone_submitted', undefined);
    });
  });

  it('track normalement si DNT=null (non configuré)', () => {
    setDnt(null);
    withPlausible(() => {
      const { track } = useAnalytics();
      track('first_submission', { module_id: 'mod-42' });
      expect(mockPlausible).toHaveBeenCalledWith('first_submission', {
        props: { module_id: 'mod-42' },
      });
    });
  });

  it('ne contient pas de PII dans les props (module_id opaque)', () => {
    withPlausible(() => {
      const { track } = useAnalytics();
      track('harness_validated', { module_id: 'mod-7', attempt_n: 1 });
      const call = mockPlausible.mock.calls[0];
      const payload = JSON.stringify(call);
      expect(payload).not.toMatch(/@[a-z0-9.]+\.[a-z]{2,}/i);
    });
  });
});
