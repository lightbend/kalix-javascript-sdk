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
    // console is ok when using node
    'no-console': 0,
    'prettier/prettier': 2,
    // Disabling violated rules for JS compatibility
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/explicit-module-boundary-types': 0,
    // we want namespaces
    '@typescript-eslint/no-namespace': 0,
    // we are careful with obj.hasOwnProperty
    'no-prototype-builtins': 1,
    // strict js does not allow ...arguments
    'prefer-rest-params': 0,
    // when we define type we do it because we want to
    '@typescript-eslint/no-inferrable-types': 0,
    // we use some empty interface placeholder types
    '@typescript-eslint/no-empty-interface': 0,
    // we use require in tests only
    '@typescript-eslint/no-var-requires': 0,
    // empty method bodies for "abstract" base class methods is fine
    '@typescript-eslint/no-empty-function': 0,
    // we use 'Function' all over the place, but the other warnings
    // are good 'String' => 'string' for example
    '@typescript-eslint/ban-types': 1,
    // detection doesn't work well enough, lots of false positives
    '@typescript-eslint/no-unused-vars': 0,
  },
};
