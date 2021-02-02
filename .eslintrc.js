module.exports = {
  env: {
    es6: true,
    node: true,
    browser: true
  },
  parser: 'babel-eslint',
  'extends': 'eslint:recommended',
  'rules': {
    // enable additional rules
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': [2, 'never'],

    // override default options for rules from base configurations
    'comma-dangle': ['error', 'never'],
    'no-cond-assign': ['error', 'always'],

    // disable rules from base configurations
    'no-console': 'off'
  }
}
