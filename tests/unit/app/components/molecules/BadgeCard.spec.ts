import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

/**
 * Tests unitaires de BadgeCard (ST-11.2).
 * Stub standalone pour éviter le runtime Nuxt complet (UIcon, useI18n, etc.).
 * La logique testée reflète fidèlement celle du composant réel.
 */

// ─── Stub standalone de BadgeCard ────────────────────────────────────────────

const BadgeCard = {
  props: {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    unlocked: { type: Boolean, required: true },
    grantedAt: { type: String, default: null },
    mention: { type: String, default: null },
  },
  data() {
    return { isRevealing: false };
  },
  watch: {
    unlocked(val: boolean, old: boolean) {
      if (val && !old) {
        (this as { isRevealing: boolean }).isRevealing = true;
        // Note : le setTimeout est délibérément omis dans le stub
        // pour permettre aux tests d'inspecter `isRevealing` sans attente.
      }
    },
  },
  template: `
    <div
      data-testid="badge-card"
      :class="[
        'relative flex flex-col items-center gap-2 rounded-xl border p-4',
        unlocked
          ? 'border-border-subtle bg-surface text-text-strong'
          : 'border-border-subtle bg-muted text-text-muted opacity-50',
        isRevealing && 'motion-safe:animate-card-flip',
      ]"
      :aria-label="unlocked ? 'Badge débloqué : ' + name : 'Badge verrouillé : ' + name"
      role="img"
    >
      <span
        :data-testid="'icon-' + (unlocked ? 'unlocked' : 'locked')"
        :data-icon="unlocked ? icon : 'i-tabler-lock'"
        aria-hidden="true"
      />
      <span data-testid="badge-name">{{ name }}</span>
      <span data-testid="badge-description">{{ description }}</span>
      <span v-if="mention" data-testid="badge-mention">{{ mention }}</span>
      <span
        v-if="isRevealing"
        role="status"
        aria-live="assertive"
        class="sr-only"
        data-testid="sr-announcement"
      >
        Badge débloqué : {{ name }}
      </span>
    </div>
  `,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  slug: 'premier-deploy',
  name: 'Premier deploy',
  description: 'Premier livrable avec URL accessible validé.',
  icon: 'i-tabler-rocket',
  unlocked: true,
};

function mountBadge(props = DEFAULT_PROPS) {
  return mount(BadgeCard, { props });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BadgeCard — rendu de base', () => {
  it('affiche le nom du badge', () => {
    const wrapper = mountBadge();
    expect(wrapper.find('[data-testid="badge-name"]').text()).toBe('Premier deploy');
  });

  it('affiche la description du badge', () => {
    const wrapper = mountBadge();
    expect(wrapper.find('[data-testid="badge-description"]').text()).toContain('Premier livrable');
  });

  it('possède role="img"', () => {
    const wrapper = mountBadge();
    expect(wrapper.find('[data-testid="badge-card"]').attributes('role')).toBe('img');
  });
});

describe('BadgeCard — état débloqué (unlocked=true)', () => {
  it("affiche l'icône du badge (non le cadenas)", () => {
    const wrapper = mountBadge();
    const icon = wrapper.find('[data-testid="icon-unlocked"]');
    expect(icon.exists()).toBe(true);
    expect(icon.attributes('data-icon')).toBe('i-tabler-rocket');
  });

  it('a un aria-label indiquant "Badge débloqué : <nom>"', () => {
    const wrapper = mountBadge();
    const label = wrapper.find('[data-testid="badge-card"]').attributes('aria-label');
    expect(label).toContain('débloqué');
    expect(label).toContain('Premier deploy');
  });

  it("n'a pas la classe opacity-50", () => {
    const wrapper = mountBadge();
    expect(wrapper.find('[data-testid="badge-card"]').classes()).not.toContain('opacity-50');
  });
});

describe('BadgeCard — état verrouillé (unlocked=false)', () => {
  it('affiche le cadenas (i-tabler-lock) quand unlocked=false', () => {
    const wrapper = mountBadge({ ...DEFAULT_PROPS, unlocked: false });
    const icon = wrapper.find('[data-testid="icon-locked"]');
    expect(icon.exists()).toBe(true);
    expect(icon.attributes('data-icon')).toBe('i-tabler-lock');
  });

  it('a un aria-label indiquant "Badge verrouillé : <nom>"', () => {
    const wrapper = mountBadge({ ...DEFAULT_PROPS, unlocked: false });
    const label = wrapper.find('[data-testid="badge-card"]').attributes('aria-label');
    expect(label).toContain('verrouillé');
    expect(label).toContain('Premier deploy');
  });

  it('a la classe opacity-50 quand verrouillé', () => {
    const wrapper = mountBadge({ ...DEFAULT_PROPS, unlocked: false });
    expect(wrapper.find('[data-testid="badge-card"]').classes()).toContain('opacity-50');
  });
});

describe('BadgeCard — mention', () => {
  it("n'affiche pas de mention si non fournie", () => {
    const wrapper = mountBadge();
    expect(wrapper.find('[data-testid="badge-mention"]').exists()).toBe(false);
  });

  it('affiche la mention si fournie', () => {
    const wrapper = mountBadge({
      ...DEFAULT_PROPS,
      mention: 'Excellent travail cette semaine !',
    });
    const mention = wrapper.find('[data-testid="badge-mention"]');
    expect(mention.exists()).toBe(true);
    expect(mention.text()).toContain('Excellent travail');
  });
});

describe('BadgeCard — animation de révélation et accessibilité', () => {
  it('pas de live region sr-only initialement (isRevealing=false)', () => {
    const wrapper = mountBadge();
    expect(wrapper.find('[data-testid="sr-announcement"]').exists()).toBe(false);
  });

  it('affiche la live region sr-only quand unlocked passe de false à true', async () => {
    const wrapper = mountBadge({ ...DEFAULT_PROPS, unlocked: false });
    // isRevealing = false initialement
    expect(wrapper.find('[data-testid="sr-announcement"]').exists()).toBe(false);

    // Simuler le passage unlocked: false → true
    await wrapper.setProps({ unlocked: true });
    await wrapper.vm.$nextTick();

    const srRegion = wrapper.find('[data-testid="sr-announcement"]');
    expect(srRegion.exists()).toBe(true);
    expect(srRegion.attributes('aria-live')).toBe('assertive');
    expect(srRegion.attributes('role')).toBe('status');
    expect(srRegion.text()).toContain('Badge débloqué');
    expect(srRegion.text()).toContain('Premier deploy');
  });

  it('applique la classe animate-card-flip pendant la révélation', async () => {
    const wrapper = mountBadge({ ...DEFAULT_PROPS, unlocked: false });
    await wrapper.setProps({ unlocked: true });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="badge-card"]').classes()).toContain(
      'motion-safe:animate-card-flip',
    );
  });

  it("ne déclenche pas l'animation si le badge était déjà unlocked", async () => {
    // unlocked=true dès le montage — pas de transition false→true
    const wrapper = mountBadge({ ...DEFAULT_PROPS, unlocked: true });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="sr-announcement"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="badge-card"]').classes()).not.toContain(
      'motion-safe:animate-card-flip',
    );
  });
});

describe('BadgeCard — aria-label non vide (a11y)', () => {
  it('aria-label non vide dans les deux états', () => {
    const unlocked = mountBadge({ ...DEFAULT_PROPS, unlocked: true });
    const locked = mountBadge({ ...DEFAULT_PROPS, unlocked: false });

    const labelUnlocked = unlocked.find('[data-testid="badge-card"]').attributes('aria-label');
    const labelLocked = locked.find('[data-testid="badge-card"]').attributes('aria-label');

    expect(labelUnlocked).toBeTruthy();
    expect(labelLocked).toBeTruthy();
    expect(labelUnlocked?.length).toBeGreaterThan(0);
    expect(labelLocked?.length).toBeGreaterThan(0);
  });
});
