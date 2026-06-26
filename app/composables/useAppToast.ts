/**
 * useAppToast — composable toast avec limite de queue.
 *
 * Wraps useToast() de @nuxt/ui avec :
 *   - queue max 3 toasts simultanés (les plus anciens sont retirés)
 *   - helpers typés add/success/warning/danger/info
 *
 * Dépendance : <AppToast /> doit être monté dans le layout racine.
 *
 * Note : @nuxt/ui useToast() utilise 'error' au lieu de 'danger' pour le variant rouge.
 */

type ToastColor = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface AppToastOptions {
  title: string;
  description?: string;
  duration?: number;
  color?: ToastColor;
  icon?: string;
}

const MAX_QUEUE = 3;

export function useAppToast() {
  const toast = useToast();

  function add(options: AppToastOptions): void {
    // Purger les toasts excédentaires (FIFO)
    const current = toast.toasts.value;
    if (current.length >= MAX_QUEUE) {
      const toRemove = current.slice(0, current.length - MAX_QUEUE + 1);
      toRemove.forEach((t) => toast.remove(t.id));
    }

    toast.add({
      title: options.title,
      // Conditional spread évite de passer `undefined` à une prop optionnelle stricte
      ...(options.description !== undefined && { description: options.description }),
      duration: options.duration ?? 5000,
      color: options.color ?? 'neutral',
      ...(options.icon !== undefined && { icon: options.icon }),
    });
  }

  function success(title: string, description?: string): void {
    const opts: AppToastOptions = { title, color: 'success', icon: 'i-tabler-circle-check' };
    if (description !== undefined) {
      opts.description = description;
    }
    add(opts);
  }

  function warning(title: string, description?: string): void {
    const opts: AppToastOptions = { title, color: 'warning', icon: 'i-tabler-alert-triangle' };
    if (description !== undefined) {
      opts.description = description;
    }
    add(opts);
  }

  /** Note: @nuxt/ui uses 'error' for the red danger variant. */
  function danger(title: string, description?: string): void {
    const opts: AppToastOptions = { title, color: 'error', icon: 'i-tabler-circle-x' };
    if (description !== undefined) {
      opts.description = description;
    }
    add(opts);
  }

  function info(title: string, description?: string): void {
    const opts: AppToastOptions = { title, color: 'info', icon: 'i-tabler-info-circle' };
    if (description !== undefined) {
      opts.description = description;
    }
    add(opts);
  }

  return { add, success, warning, danger, info };
}
