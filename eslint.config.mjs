// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'prisma/seed.ts', 'dist/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Autorisé : le any explicite est parfois nécessaire avec Prisma
      '@typescript-eslint/no-explicit-any': 'off',

      // Désactivé : Prisma génère des types complexes non résolus par ESLint
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // Désactivé : findMany/findAll Prisma sont synchrones dans leur écriture
      '@typescript-eslint/require-await': 'off',

      // Désactivé : le type User de Prisma est complexe
      '@typescript-eslint/no-redundant-type-constituents': 'off',

      // Gardé actif : vraies règles utiles
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
