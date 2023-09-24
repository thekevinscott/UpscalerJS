const jestconfig = require('./jestconfig.json');
module.exports = {
  ...jestconfig,
  roots: [
    "<rootDir>/integration/browserstack",
  ],
  "transform": {
     "^.+\\.(ts|tsx)?$": [
      "ts-jest", {
      "tsconfig": {
        "importHelpers": false,
        "target": "esnext",
        "module": "esnext",
        "moduleResolution": "node",
        "esModuleInterop": true,
        "emitDecoratorMetadata": true,
        "experimentalDecorators": true,
        "allowSyntheticDefaultImports": true,
        "sourceMap": true,
        "noEmit": true,
        "noEmitHelpers": false,
        "strictNullChecks": false
      }
    }
    ],
     "^.+\\.(js|jsx)$": "babel-jest"
  },

};
