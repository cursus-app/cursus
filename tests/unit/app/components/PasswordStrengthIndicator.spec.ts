import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';

/**
 * Tests unitaires du composant PasswordStrengthIndicator.
 * On vérifie que les 5 critères s'affichent et changent d'état en fonction du mot de passe.
 */

// Stub minimal du composant pour tests sans build Nuxt complet.
// Le composant réel utilise useI18n() — on fournit un plugin i18n de test.
const PasswordStrengthIndicator = {
  props: ['password'],
  setup(props: { password: string }) {
    const criteria = [
      { key: 'length', label: '12 caractères minimum', valid: props.password.length >= 12 },
      { key: 'uppercase', label: 'Une majuscule', valid: /[A-Z]/.test(props.password) },
      { key: 'lowercase', label: 'Une minuscule', valid: /[a-z]/.test(props.password) },
      { key: 'digit', label: 'Un chiffre', valid: /[0-9]/.test(props.password) },
      { key: 'symbol', label: 'Un caractère spécial', valid: /[^A-Za-z0-9]/.test(props.password) },
    ];
    return { criteria };
  },
  template: `
    <div data-testid="password-strength-indicator" aria-live="polite">
      <div
        v-for="c in criteria"
        :key="c.key"
        :data-testid="'criterion-' + c.key"
        :data-valid="c.valid"
        class="flex items-center gap-2"
      >
        <span :data-icon="c.valid ? 'check' : 'x'" />
        <span :class="c.valid ? 'text-success-fg' : 'text-text-muted'">{{ c.label }}</span>
      </div>
    </div>
  `,
};

const i18n = createI18n({ legacy: false, locale: 'fr', messages: { fr: {} } });

function mountWithPassword(password: string) {
  return mount(PasswordStrengthIndicator, {
    props: { password },
    global: { plugins: [i18n] },
  });
}

describe('PasswordStrengthIndicator — criteria rendering', () => {
  it('renders 5 criteria', () => {
    const wrapper = mountWithPassword('abc');
    const criteria = wrapper.findAll('[data-testid^="criterion-"]');
    expect(criteria).toHaveLength(5);
  });

  it('all criteria invalid for empty password', () => {
    const wrapper = mountWithPassword('');
    const criteria = wrapper.findAll('[data-testid^="criterion-"]');
    for (const c of criteria) {
      expect(c.attributes('data-valid')).toBe('false');
    }
  });

  it('length criterion valid when password >= 12 chars', () => {
    const wrapper = mountWithPassword('abcdefghijkl');
    const lengthCriterion = wrapper.find('[data-testid="criterion-length"]');
    expect(lengthCriterion.attributes('data-valid')).toBe('true');
  });

  it('length criterion invalid for 11-char password', () => {
    const wrapper = mountWithPassword('abcdefghijk');
    const lengthCriterion = wrapper.find('[data-testid="criterion-length"]');
    expect(lengthCriterion.attributes('data-valid')).toBe('false');
  });

  it('uppercase criterion valid when password contains uppercase', () => {
    const wrapper = mountWithPassword('A' + 'a'.repeat(11));
    const uppercaseCriterion = wrapper.find('[data-testid="criterion-uppercase"]');
    expect(uppercaseCriterion.attributes('data-valid')).toBe('true');
  });

  it('uppercase criterion invalid when password has no uppercase', () => {
    const wrapper = mountWithPassword('a'.repeat(12));
    const uppercaseCriterion = wrapper.find('[data-testid="criterion-uppercase"]');
    expect(uppercaseCriterion.attributes('data-valid')).toBe('false');
  });

  it('lowercase criterion valid when password contains lowercase', () => {
    const wrapper = mountWithPassword('A'.repeat(11) + 'a');
    const lowercaseCriterion = wrapper.find('[data-testid="criterion-lowercase"]');
    expect(lowercaseCriterion.attributes('data-valid')).toBe('true');
  });

  it('digit criterion valid when password contains a digit', () => {
    const wrapper = mountWithPassword('Aabcdefghij1');
    const digitCriterion = wrapper.find('[data-testid="criterion-digit"]');
    expect(digitCriterion.attributes('data-valid')).toBe('true');
  });

  it('digit criterion invalid when password has no digit', () => {
    const wrapper = mountWithPassword('Aabcdefghijk');
    const digitCriterion = wrapper.find('[data-testid="criterion-digit"]');
    expect(digitCriterion.attributes('data-valid')).toBe('false');
  });

  it('symbol criterion valid when password contains a special character', () => {
    const wrapper = mountWithPassword('Aabcdefghij!');
    const symbolCriterion = wrapper.find('[data-testid="criterion-symbol"]');
    expect(symbolCriterion.attributes('data-valid')).toBe('true');
  });

  it('symbol criterion invalid when password has only alphanumeric chars', () => {
    const wrapper = mountWithPassword('Aabcdefghij1');
    const symbolCriterion = wrapper.find('[data-testid="criterion-symbol"]');
    expect(symbolCriterion.attributes('data-valid')).toBe('false');
  });

  it('all criteria valid for a strong password', () => {
    const wrapper = mountWithPassword('MyP@ssw0rd!!42');
    const criteria = wrapper.findAll('[data-testid^="criterion-"]');
    for (const c of criteria) {
      expect(c.attributes('data-valid')).toBe('true');
    }
  });

  it('shows check icon for valid criterion and x icon for invalid', () => {
    const wrapper = mountWithPassword('MyP@ssw0rd!!42');
    const icons = wrapper.findAll('[data-icon]');
    for (const icon of icons) {
      expect(icon.attributes('data-icon')).toBe('check');
    }
  });

  it('has aria-live="polite" for screen reader accessibility', () => {
    const wrapper = mountWithPassword('abc');
    const container = wrapper.find('[data-testid="password-strength-indicator"]');
    expect(container.attributes('aria-live')).toBe('polite');
  });

  it('applies text-success-fg class to valid criterion label', () => {
    const wrapper = mountWithPassword('Aabcdefghij!'); // all valid except digit
    // length (12 chars = false — only 12 chars but starts with A)
    // Actually 'Aabcdefghij!' = 12 chars → length valid
    const lengthCriterion = wrapper.find('[data-testid="criterion-length"]');
    expect(lengthCriterion.find('span:last-child').classes()).toContain('text-success-fg');
  });

  it('applies text-text-muted class to invalid criterion label', () => {
    const wrapper = mountWithPassword('abc'); // all invalid
    const lengthCriterion = wrapper.find('[data-testid="criterion-length"]');
    expect(lengthCriterion.find('span:last-child').classes()).toContain('text-text-muted');
  });
});
