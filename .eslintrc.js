module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  ignorePatterns: ['*.d.ts', '**/proto/**/*.*'],
  rules: {
    // 2 -> error | 1 -> warning | 0 -> disabled
    'no-console': 2,
    'prettier/prettier': 2,
    // Disabling violated rules for JS compatibility
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0
  },
}
