import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      // Add custom rules here
    },
  },
]; 