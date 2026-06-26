// Stub du module virtuel Nuxt `#supabase/server` pour les tests Vitest.
// Ce fichier remplace le module virtuel généré par @nuxtjs/supabase au build Nuxt.
// Les fonctions sont des no-ops — les tests mockent avec vi.mock() par-dessus.
import type { H3Event } from 'h3';

export async function serverSupabaseUser(_event: H3Event): Promise<null> {
  return null;
}

export async function serverSupabaseClient(_event: H3Event): Promise<null> {
  return null;
}

/**
 * Stub du client admin Supabase (service role).
 * Les tests qui ont besoin de ce client mockent `#supabase/server` via vi.mock().
 */
export function serverSupabaseServiceRole(_event: H3Event): {
  auth: {
    admin: {
      inviteUserByEmail: (
        email: string,
        options?: { redirectTo?: string },
      ) => Promise<{ data: Record<string, unknown>; error: null | { code: string } }>;
    };
  };
} {
  return {
    auth: {
      admin: {
        inviteUserByEmail: async (_email: string, _options?: { redirectTo?: string }) => ({
          data: {},
          error: null,
        }),
      },
    },
  };
}
