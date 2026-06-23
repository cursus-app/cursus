// @ts-check
/** @type {import('prettier').Config} */
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  bracketSpacing: true,
  bracketSameLine: false,
  endOfLine: 'lf',
  vueIndentScriptAndStyle: false,
  htmlWhitespaceSensitivity: 'css',
  // Tailwind v4 — le plugin trie automatiquement les utility classes
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './assets/css/main.css',
  tailwindFunctions: ['clsx', 'cn', 'cva', 'tw'],
  overrides: [
    {
      files: '*.md',
      options: { proseWrap: 'preserve', printWidth: 120 },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: { tabWidth: 2 },
    },
  ],
};
