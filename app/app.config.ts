// Configuration runtime de @nuxt/ui v4.
// Cf. https://ui.nuxt.com/getting-started/theme
// Doc design : 10-design-system.md
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'accent', // mappe sur les tokens --color-accent-* du @theme
      neutral: 'zinc',
    },
    button: {
      defaultVariants: {
        size: 'md',
        color: 'primary',
      },
    },
    formField: {
      slots: {
        // Erreurs annoncées via aria-live (cf. 09-engineering-playbook §7.2)
        error: 'text-danger-base text-sm mt-1',
      },
    },
  },

  // Métadonnées app exposées au runtime (consommables côté client)
  app: {
    name: 'Cursus',
    description: 'Gestion de parcours de stages tech',
    supportEmail: 'support@cursus.app',
  },
});
