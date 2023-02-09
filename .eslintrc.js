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
    'no-console': 1,
    'prettier/prettier': 2,
    // Disabling violated rules for JS compatibility
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    // errors after upgrading eslint to 8.3
    // FIXME investigate each and fix instead of down-prioritize here
    '@typescript-eslint/no-namespace': 1,
    '@typescript-eslint/no-empty-interface': 1,
    '@typescript-eslint/no-var-requires': 1,
    '@typescript-eslint/no-empty-function': 1,
    'no-prototype-builtins': 1,
    '@typescript-eslint/no-inferrable-types': 1,
    '@typescript-eslint/ban-types': 1,
    '@typescript-eslint/no-this-alias': 1,
    'no-empty': 1,
    // strict js does not allow ...arguments
    'prefer-rest-params': 1,
    'prefer-spread': 1,
  },
};
