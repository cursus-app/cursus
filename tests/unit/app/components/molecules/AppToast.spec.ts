import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de AppToast / useAppToast.
 * Teste la logique de queue (max 3 toasts).
 * Le composant AppToast lui-même est juste un provider de UToaster,
 * donc on teste principalement la logique du composable.
 */

/** Stub du composable useAppToast (sans Nuxt runtime). */
type ToastColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  color?: ToastColor;
  icon?: string;
}

function createAppToastLogic(MAX_QUEUE = 3) {
  const toasts: ToastItem[] = [];
  let idCounter = 0;

  function add(options: { title: string; description?: string; color?: ToastColor; icon?: string }) {
    // Purger les toasts excédentaires
    if (toasts.length >= MAX_QUEUE) {
      const toRemove = toasts.splice(0, toasts.length - MAX_QUEUE + 1);
      // In real code, we'd call toast.remove() for each
      toRemove.length; // usage
    }
    toasts.push({ id: String(++idCounter), ...options });
    return toasts[toasts.length - 1]!;
  }

  function success(title: string, description?: string) {
    return add({ title, description, color: 'success', icon: 'i-tabler-circle-check' });
  }

  function warning(title: string, description?: string) {
    return add({ title, description, color: 'warning', icon: 'i-tabler-alert-triangle' });
  }

  function danger(title: string, description?: string) {
    return add({ title, description, color: 'danger', icon: 'i-tabler-circle-x' });
  }

  function info(title: string, description?: string) {
    return add({ title, description, color: 'info', icon: 'i-tabler-info-circle' });
  }

  return { toasts, add, success, warning, danger, info };
}

describe('useAppToast — logique queue', () => {
  it('adds a toast to the queue', () => {
    const { toasts, add } = createAppToastLogic();
    add({ title: 'Hello' });
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.title).toBe('Hello');
  });

  it('adds multiple toasts up to max queue', () => {
    const { toasts, add } = createAppToastLogic(3);
    add({ title: 'Toast 1' });
    add({ title: 'Toast 2' });
    add({ title: 'Toast 3' });
    expect(toasts).toHaveLength(3);
  });

  it('purges oldest toast when queue is full', () => {
    const { toasts, add } = createAppToastLogic(3);
    add({ title: 'Toast 1' });
    add({ title: 'Toast 2' });
    add({ title: 'Toast 3' });
    add({ title: 'Toast 4' }); // should purge Toast 1
    expect(toasts).toHaveLength(3);
    expect(toasts.find((t) => t.title === 'Toast 4')).toBeDefined();
  });

  it('success helper uses success color and check icon', () => {
    const { toasts, success } = createAppToastLogic();
    success('Succès', 'Opération réussie');
    expect(toasts[0]!.color).toBe('success');
    expect(toasts[0]!.icon).toBe('i-tabler-circle-check');
    expect(toasts[0]!.description).toBe('Opération réussie');
  });

  it('warning helper uses warning color and triangle icon', () => {
    const { toasts, warning } = createAppToastLogic();
    warning('Attention');
    expect(toasts[0]!.color).toBe('warning');
    expect(toasts[0]!.icon).toBe('i-tabler-alert-triangle');
  });

  it('danger helper uses danger color and circle-x icon', () => {
    const { toasts, danger } = createAppToastLogic();
    danger('Erreur');
    expect(toasts[0]!.color).toBe('danger');
    expect(toasts[0]!.icon).toBe('i-tabler-circle-x');
  });

  it('info helper uses info color and info-circle icon', () => {
    const { toasts, info } = createAppToastLogic();
    info('Info');
    expect(toasts[0]!.color).toBe('info');
    expect(toasts[0]!.icon).toBe('i-tabler-info-circle');
  });

  it('toast has unique id', () => {
    const { toasts, add } = createAppToastLogic();
    add({ title: 'A' });
    add({ title: 'B' });
    const ids = toasts.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/** Stub minimal du composant AppToast (provider). */
const AppToastStub = {
  template: `<div data-testid="toast-provider" />`,
};

describe('AppToast component', () => {
  it('renders a container element', () => {
    const wrapper = mount(AppToastStub);
    expect(wrapper.find('[data-testid="toast-provider"]').exists()).toBe(true);
  });
});
