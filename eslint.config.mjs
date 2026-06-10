import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config (eslint 10), replacing the former .eslintrc.js files. Mirrors the
// previous setup: typescript-eslint recommended + type-checked, prettier last,
// and the same project rules. (`@typescript-eslint/semi` is gone — removed in
// typescript-eslint v8; prettier enforces semicolons.)
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.wireit/**',
      '**/node_modules/**',
      '**/*.test.ts',
      '**/*.generated.ts',
    ],
  },
  // Match eslint 8's default: don't flag pre-existing eslint-disable comments as
  // unused. eslint 9+ defaults this to "warn"; leaving the repo's existing
  // directives in place keeps the diff minimal and avoids churning lines that
  // other tools (DeepSource) attribute as newly-introduced issues.
  {
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        // Use the same tsconfig the build/old config used (tsconfig.eslint.json,
        // module: commonjs). projectService picks tsconfig.json (node16
        // resolution), which resolves different tfjs .d.ts overloads and produces
        // spurious no-unnecessary-type-assertion errors that disagree with tsc.
        project: [
          './tsconfig.eslint.json',
          './packages/*/tsconfig.eslint.json',
          './models/tsconfig.eslint.json',
          './internals/tsconfig.eslint.json',
          './internals/*/tsconfig.eslint.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'comma-dangle': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  // JS files aren't part of a TS project; type-checked rules can't run on them.
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  eslintConfigPrettier,
);
