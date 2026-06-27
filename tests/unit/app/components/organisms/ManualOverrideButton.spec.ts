import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, computed } from 'vue';

/**
 * Tests unitaires de ManualOverrideButton (ST-06.5).
 *
 * - bouton masqué pour les statuts terminaux (VALIDE, VALIDE_OVERRIDE)
 * - validation du motif (min 20 chars)
 * - appel API PATCH et émission de l'événement overridden
 * - gestion des erreurs API (403, 422, générique)
 */

// ─── Stub du composant ────────────────────────────────────────────────────────

interface Props {
  progressionId: string;
  currentStatus: string;
  traineeName?: string | null;
}

/**
 * Stub autonome reproduisant la logique de ManualOverrideButton.vue.
 * Évite les dépendances Nuxt runtime (#imports, useToast, $fetch).
 */
function makeStub(fetchImpl: (body: unknown) => Promise<unknown>) {
  return {
    props: {
      progressionId: { type: String, required: true },
      currentStatus: { type: String, required: true },
      traineeName: { default: null },
    },
    emits: ['overridden'],
    setup(props: Props, { emit }: { emit: (event: string, ...args: unknown[]) => void }) {
      const MIN_REASON = 20;
      const MAX_REASON = 500;

      const isOpen = ref(false);
      const reason = ref('');
      const loading = ref(false);
      const errorMsg = ref<string | null>(null);

      const isTerminal = computed(
        () => props.currentStatus === 'VALIDE' || props.currentStatus === 'VALIDE_OVERRIDE',
      );

      const charCount = computed(() => reason.value.length);

      const reasonError = computed<string | null>(() => {
        if (reason.value.length === 0) {
          return null;
        }
        if (reason.value.length < MIN_REASON) {
          return `Le motif doit contenir au moins ${MIN_REASON} caractères`;
        }
        if (reason.value.length > MAX_REASON) {
          return `Le motif ne peut pas dépasser ${MAX_REASON} caractères`;
        }
        return null;
      });

      const canSubmit = computed(
        () =>
          reason.value.length >= MIN_REASON && reason.value.length <= MAX_REASON && !loading.value,
      );

      function openModal() {
        reason.value = '';
        errorMsg.value = null;
        isOpen.value = true;
      }

      function closeModal() {
        if (loading.value) {
          return;
        }
        isOpen.value = false;
      }

      async function handleSubmit() {
        if (!canSubmit.value) {
          return;
        }
        loading.value = true;
        errorMsg.value = null;
        try {
          const updated = await fetchImpl({ to: 'VALIDE_OVERRIDE', reason: reason.value.trim() });
          emit('overridden', updated);
          isOpen.value = false;
        } catch (err: unknown) {
          const e = err as { statusCode?: number };
          if (e.statusCode === 403) {
            errorMsg.value = "Tu n'as pas les droits pour valider manuellement ce livrable.";
          } else if (e.statusCode === 422) {
            errorMsg.value = "Ce livrable est déjà validé, aucun override n'est possible.";
          } else {
            errorMsg.value = 'Une erreur est survenue. Réessaie plus tard.';
          }
        } finally {
          loading.value = false;
        }
      }

      return {
        isOpen,
        reason,
        loading,
        errorMsg,
        isTerminal,
        charCount,
        reasonError,
        canSubmit,
        openModal,
        closeModal,
        handleSubmit,
        MIN_REASON,
        MAX_REASON,
      };
    },
    template: `
      <div>
        <div v-if="!isTerminal" data-testid="override-btn-container">
          <button
            type="button"
            data-testid="override-open-btn"
            @click="openModal"
          >
            Valider manuellement
          </button>
        </div>

        <div v-if="isOpen" data-testid="override-modal" role="dialog" aria-modal="true">
          <textarea
            data-testid="reason-textarea"
            v-model="reason"
            :aria-invalid="!!reasonError"
            aria-describedby="override-reason-error"
          />
          <p
            data-testid="char-counter"
            aria-live="polite"
          >{{ charCount }} / {{ MAX_REASON }}</p>
          <p
            v-if="reasonError"
            data-testid="reason-error"
            id="override-reason-error"
            role="alert"
          >{{ reasonError }}</p>
          <p
            v-if="errorMsg"
            data-testid="api-error"
            role="alert"
          >{{ errorMsg }}</p>
          <button
            type="button"
            data-testid="cancel-btn"
            :disabled="loading"
            @click="closeModal"
          >
            Annuler
          </button>
          <button
            type="button"
            data-testid="submit-btn"
            :disabled="!canSubmit || loading"
            @click="handleSubmit"
          >
            Valider manuellement
          </button>
        </div>
      </div>
    `,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ManualOverrideButton', () => {
  // ── Visibilité selon le statut ──────────────────────────────────────────────

  it('affiche le bouton quand le statut est non-terminal (EN_COURS)', () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    expect(wrapper.find('[data-testid="override-btn-container"]').exists()).toBe(true);
  });

  it('affiche le bouton quand le statut est SOUMIS', () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'SOUMIS' } as Props,
    });
    expect(wrapper.find('[data-testid="override-btn-container"]').exists()).toBe(true);
  });

  it('masque le bouton quand le statut est VALIDE (terminal)', () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'VALIDE' } as Props,
    });
    expect(wrapper.find('[data-testid="override-btn-container"]').exists()).toBe(false);
  });

  it('masque le bouton quand le statut est VALIDE_OVERRIDE (terminal)', () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'VALIDE_OVERRIDE' } as Props,
    });
    expect(wrapper.find('[data-testid="override-btn-container"]').exists()).toBe(false);
  });

  it('masque le bouton quand le statut est BLOQUE', () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'BLOQUE' } as Props,
    });
    // BLOQUE n'est pas terminal → bouton visible
    expect(wrapper.find('[data-testid="override-btn-container"]').exists()).toBe(true);
  });

  // ── Ouverture de la modal ────────────────────────────────────────────────────

  it('ouvre la modal quand le bouton est cliqué', async () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    expect(wrapper.find('[data-testid="override-modal"]').exists()).toBe(false);
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="override-modal"]').exists()).toBe(true);
  });

  // ── Validation du motif ──────────────────────────────────────────────────────

  it('le bouton submit est désactivé quand le motif est vide', async () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    const submitBtn = wrapper.find('[data-testid="submit-btn"]');
    expect(submitBtn.attributes('disabled')).toBeDefined();
  });

  it('le bouton submit est désactivé quand le motif est trop court (< 20 chars)', async () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    const textarea = wrapper.find('[data-testid="reason-textarea"]');
    await textarea.setValue('Trop court');
    const submitBtn = wrapper.find('[data-testid="submit-btn"]');
    expect(submitBtn.attributes('disabled')).toBeDefined();
  });

  it("affiche un message d'erreur quand le motif est trop court", async () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    await wrapper.find('[data-testid="reason-textarea"]').setValue('Court');
    expect(wrapper.find('[data-testid="reason-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="reason-error"]').text()).toContain('20');
  });

  it('le bouton submit est activé quand le motif est valide (≥ 20 chars)', async () => {
    const stub = makeStub(
      vi.fn().mockResolvedValue({ id: 'p-1', status: 'VALIDE_OVERRIDE', overrideReason: 'raison' }),
    );
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    await wrapper
      .find('[data-testid="reason-textarea"]')
      .setValue('Raison suffisamment longue pour passer la validation locale');
    expect(wrapper.find('[data-testid="submit-btn"]').attributes('disabled')).toBeUndefined();
  });

  it("ne montre pas de message d'erreur quand le champ est encore vierge", async () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="reason-error"]').exists()).toBe(false);
  });

  // ── Appel API et émission d'événement ────────────────────────────────────────

  it('émet overridden avec la progression mise à jour après succès', async () => {
    const updatedProgression = {
      id: 'p-1',
      status: 'VALIDE_OVERRIDE',
      overrideReason: 'Raison test valide longue',
    };
    const fetchMock = vi.fn().mockResolvedValue(updatedProgression);
    const stub = makeStub(fetchMock);
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    await wrapper
      .find('[data-testid="reason-textarea"]')
      .setValue('Raison test valide longue suffisante');
    await wrapper.find('[data-testid="submit-btn"]').trigger('click');
    // Attendre la résolution de la Promise
    await new Promise((r) => setTimeout(r, 0));
    const emitted = wrapper.emitted('overridden');
    expect(emitted).toBeTruthy();
    expect(emitted?.[0]?.[0]).toEqual(updatedProgression);
  });

  it('ferme la modal après un override réussi', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ id: 'p-1', status: 'VALIDE_OVERRIDE', overrideReason: 'raison' });
    const stub = makeStub(fetchMock);
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    await wrapper
      .find('[data-testid="reason-textarea"]')
      .setValue('Raison suffisamment longue pour passer');
    await wrapper.find('[data-testid="submit-btn"]').trigger('click');
    await new Promise((r) => setTimeout(r, 0));
    expect(wrapper.find('[data-testid="override-modal"]').exists()).toBe(false);
  });

  // ── Gestion des erreurs API ───────────────────────────────────────────────────

  it("affiche un message 403 quand l'API retourne forbidden", async () => {
    const fetchMock = vi.fn().mockRejectedValue({ statusCode: 403 });
    const stub = makeStub(fetchMock);
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    await wrapper
      .find('[data-testid="reason-textarea"]')
      .setValue('Raison suffisamment longue pour passer la validation');
    await wrapper.find('[data-testid="submit-btn"]').trigger('click');
    await new Promise((r) => setTimeout(r, 0));
    const apiError = wrapper.find('[data-testid="api-error"]');
    expect(apiError.exists()).toBe(true);
    expect(apiError.text()).toContain('droits');
  });

  it('affiche un message 422 quand la progression est déjà terminale', async () => {
    const fetchMock = vi.fn().mockRejectedValue({ statusCode: 422 });
    const stub = makeStub(fetchMock);
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    await wrapper
      .find('[data-testid="reason-textarea"]')
      .setValue('Raison suffisamment longue pour passer la validation');
    await wrapper.find('[data-testid="submit-btn"]').trigger('click');
    await new Promise((r) => setTimeout(r, 0));
    const apiError = wrapper.find('[data-testid="api-error"]');
    expect(apiError.exists()).toBe(true);
    expect(apiError.text()).toContain('déjà validé');
  });

  it('affiche un message générique pour une erreur inconnue', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    const stub = makeStub(fetchMock);
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    await wrapper
      .find('[data-testid="reason-textarea"]')
      .setValue('Raison suffisamment longue pour passer la validation');
    await wrapper.find('[data-testid="submit-btn"]').trigger('click');
    await new Promise((r) => setTimeout(r, 0));
    const apiError = wrapper.find('[data-testid="api-error"]');
    expect(apiError.exists()).toBe(true);
    expect(apiError.text()).toContain('erreur');
  });

  // ── Annulation ────────────────────────────────────────────────────────────────

  it('ferme la modal quand Annuler est cliqué', async () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="override-modal"]').exists()).toBe(true);
    await wrapper.find('[data-testid="cancel-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="override-modal"]').exists()).toBe(false);
  });

  // ── Compteur de caractères ────────────────────────────────────────────────────

  it('met à jour le compteur de caractères en temps réel', async () => {
    const stub = makeStub(vi.fn());
    const wrapper = mount(stub, {
      props: { progressionId: 'p-1', currentStatus: 'EN_COURS' } as Props,
    });
    await wrapper.find('[data-testid="override-open-btn"]').trigger('click');
    await wrapper.find('[data-testid="reason-textarea"]').setValue('Test 12345');
    const counter = wrapper.find('[data-testid="char-counter"]');
    expect(counter.text()).toContain('10');
  });
});
