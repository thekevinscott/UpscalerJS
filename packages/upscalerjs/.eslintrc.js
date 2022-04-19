module.exports = {
  "env": {
    "browser": true,
    "es6": true
  },
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json",
    "sourceType": "module"
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "rules": {
    "@typescript-eslint/semi": ["error", "always"],
    "comma-dangle": ["error", "always"],
    "curly": ["error", "all"],
    "no-empty": [
      "error",
      {
        "allowEmptyCatch": true
      }
    ],
  }
};
