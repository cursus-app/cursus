import { ref } from 'vue';

interface Toast {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  color?: string;
  icon?: string;
  [key: string]: unknown;
}

export function useToast() {
  const toasts = ref<Toast[]>([]);

  function add(options: Omit<Toast, 'id'>): string {
    const id = String(toasts.value.length + 1);
    toasts.value.push({ ...options, id });
    return id;
  }

  function remove(id: string): void {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function clear(): void {
    toasts.value = [];
  }

  return { toasts, add, remove, clear };
}
