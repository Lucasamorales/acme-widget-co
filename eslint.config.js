// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/dist', '**/coverage'] },
  eslint.configs.recommended,

  // Type-aware rules use the TypeScript compiler, so they catch bugs plain
  // linting cannot, such as a promise that is never awaited or handled.
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // A leading underscore marks a parameter that must exist but is unused,
      // e.g. the four-parameter signature Express needs for error handlers.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // The rules of hooks, plus the React Compiler's checks for effects, refs
  // and render purity.
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },

  // Plain JS config files are not part of any tsconfig.
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },

  // Must be last: turns off rules that would fight Prettier's formatting.
  prettier,
);
