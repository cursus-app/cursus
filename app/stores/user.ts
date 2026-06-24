/**
 * Store Pinia pour le contexte utilisateur authentifié.
 * Chargé par auth.global.ts au montage et après chaque login.
 * Les rôles sont stockés ici uniquement — jamais dans localStorage.
 */
import { defineStore } from 'pinia';

export interface UserMembership {
  cohorteId: string;
  role: 'STAGIAIRE' | 'FORMATEUR_PRINCIPAL' | 'CO_FORMATEUR';
  cohorte: { id: string; name: string };
}

type GlobalRole = 'STAGIAIRE' | 'FORMATEUR_PRINCIPAL' | 'CO_FORMATEUR' | 'ADMIN';

export interface UserContext {
  userId: string;
  globalRole: GlobalRole | null;
  memberships: UserMembership[];
}

export const useUserStore = defineStore('user', () => {
  const userId = ref<string | null>(null);
  const globalRole = ref<GlobalRole | null>(null);
  const memberships = ref<UserMembership[]>([]);

  function setUserContext(context: UserContext): void {
    userId.value = context.userId;
    globalRole.value = context.globalRole;
    memberships.value = context.memberships;
  }

  function clearUserContext(): void {
    userId.value = null;
    globalRole.value = null;
    memberships.value = [];
  }

  return { userId, globalRole, memberships, setUserContext, clearUserContext };
});
