/**
 * Middleware global d'authentification et de chargement du contexte RBAC.
 * S'exécute sur chaque navigation (côté client et SSR).
 *
 * Responsabilités :
 * 1. Redirige vers /login si la route est protégée et l'utilisateur non connecté.
 * 2. Charge le profil utilisateur (rôle global + memberships) depuis /api/me.
 * 3. Hydrate le Pinia store useUserStore().
 *
 * Sécurité : les rôles ne sont jamais lus depuis localStorage.
 * La RLS Supabase reste la dernière ligne de défense côté DB.
 */

// Routes accessibles sans session authentifiée.
const PUBLIC_ROUTE_PREFIXES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/invite',
  '/check-email',
  '/legal/',
] as const;

function isPublicRoute(path: string): boolean {
  return path === '/' || PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser();
  const userStore = useUserStore();

  // Non connecté sur route protégée → redirige vers login.
  if (!user.value) {
    userStore.clearUserContext();
    if (!isPublicRoute(to.path)) {
      return navigateTo('/login');
    }
    return;
  }

  // Connecté : charger le contexte RBAC si pas encore hydraté.
  // On ne recharge pas à chaque navigation pour des raisons de performance
  // (< 10ms exigé dans la DoD). Le store est invalidé lors du logout.
  if (userStore.userId !== user.value['id']) {
    try {
      const profile = await $fetch('/api/me');
      userStore.setUserContext({
        userId: profile['id'],
        globalRole: profile['globalRole'] as Parameters<
          typeof userStore.setUserContext
        >[0]['globalRole'],
        memberships: profile['memberships'].map((m) => ({
          cohorteId: m['cohorteId'],
          role: m['role'] as 'STAGIAIRE' | 'FORMATEUR_PRINCIPAL' | 'CO_FORMATEUR',
          cohorte: m['cohorte'],
        })),
      });

      // Applique la préférence de thème stockée en DB (priorité DB > localStorage).
      // Ne s'exécute que côté client pour ne pas écraser le SSR cookie-based theme.
      if (import.meta.client && profile['theme']) {
        const colorMode = useColorMode();
        colorMode.preference = profile['theme'] as string;
      }
    } catch {
      // L'utilisateur est authentifié dans Supabase mais absent de notre DB.
      // Cela peut arriver si le webhook de création de profil a échoué.
      // On l'autorise à continuer vers les routes publiques, sinon → login.
      if (!isPublicRoute(to.path)) {
        return navigateTo('/login');
      }
    }
  }
});
