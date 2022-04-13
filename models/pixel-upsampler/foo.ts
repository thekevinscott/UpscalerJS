// import path from 'path';
// import fs from 'fs';
import { compile } from "../../scripts/package-scripts/utils/compile";
import ts from "typescript";

// const ROOT_DIR = path.resolve(__dirname, '../..');

const TSCONFIG: ts.CompilerOptions = {
  "skipLibCheck": true,
  "esModuleInterop": true,
  "target": ts.ScriptTarget.ES2020,
  "module": ts.ModuleKind.CommonJS,
  // "declaration": true,
    "paths": {
      "~upscaler": ["../../../packages/upscalerjs/src/types"],
    },
  "strict": true,
  "forceConsistentCasingInFileNames": true,
  "noUnusedLocals": true,
  "strictNullChecks": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "composite": true,
  "noFallthroughCasesInSwitch": true,
    "baseUrl": "./src",
    "rootDir": "./src",
    "outDir": "./dist",
  // "paths": {
  //   "~upscaler": [path.resolve(ROOT_DIR, 'packages/upscalerjs/src/types')],
  // },
  // "composite": true,
  // baseUrl: ROOT_DIR,
  // "paths": {
  //   "upscaler": [path.resolve(ROOT_DIR, 'packages/upscalerjs/src/types')],
  // },
  // "references": [      // this is how we declare a dependency from
  //   { "upscaler": path.resolve(ROOT_DIR, 'packages/upscalerjs/src/types'), }
  // ],
  // rootDir: SRC,
  // references,
};

(async () => {
  const files = ['./src/2x-3.ts'];
    await compile(files, {
      ...TSCONFIG,
      // outDir: './dist',
    });
})();
