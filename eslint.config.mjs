import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

// Flat config (eslint 10). Replaces the former .eslintrc.js files. Mirrors the
// old setup: typescript-eslint recommended + type-checked, prettier last, and a
// few project rules. `@typescript-eslint/semi` was dropped (removed in
// typescript-eslint v8 — stylistic rules live in @stylistic now; prettier owns
// formatting anyway).
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
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'comma-dangle': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  // JS config files (babel.config.js, etc.) aren't in any TS project — turn off
  // type-checked rules for them so they don't error on missing type info.
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  eslintConfigPrettier,
);
