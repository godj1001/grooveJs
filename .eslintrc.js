module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    indent: [2, 2, { SwitchCase: 1 }],
    'key-spacing': [2, { beforeColon: false, afterColon: true }],
    semi: [2, 'never'],
    'semi-spacing': 0,
    'space-before-blocks': [2, 'always'],
    'space-before-function-paren': [2, 'always'],
    'space-in-parens': [2, 'never'],
    'space-infix-ops': 2,
    'space-unary-ops': [2, { words: true, nonwords: false }],
    'spaced-comment': [2, 'always', { markers: ['global', 'globals', 'eslint', 'eslint-disable', '*package', '!'] }]
  }
}
