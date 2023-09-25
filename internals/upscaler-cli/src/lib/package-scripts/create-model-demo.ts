import fsExtra from 'fs-extra';
const { writeFile, copy, mkdirp, } = fsExtra;
import path from 'path';
import yargs from 'yargs';
import { ifDefined as _ifDefined } from './prompt/ifDefined';
import { MODELS_DIR } from './utils/constants';

/***
 * Types
 */

/****
 * Utility functions
 */

const makeDemoFolder = async (model: string) => {
  await mkdirp(path.resolve(MODELS_DIR, model, 'demo'));
};

const copyFixture = async (model: string) => {
  const modelRoot = path.resolve(MODELS_DIR, model);
  await copy(path.resolve(modelRoot, 'assets/fixture.png'), path.resolve(modelRoot, 'demo', 'fixture.png'));
};

const getIndexJSFile = (model: string) => `
import Upscaler from "upscaler";
import * as models from '@upscalerjs/${model}';
import fixture from "./fixture.png";

const upscaler = new Upscaler({
  model: models.small,
});

upscaler.upscale(fixture).then((upscaledImgSrc) => {
  const img = document.createElement("img");
  img.src = upscaledImgSrc;
  document.getElementById("target").appendChild(img);
});
`;

const getIndexHTMLFile = (model: string) => `
<html>
<head>
  <title>@upscalerjs/${model}</title>
  <style>
    body {
      padding: 40px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    button {
      margin-top: 20px;
      display: block;
      padding: 10px 40px;
    }
    #target {
      background: #EEE;
      border: 1px solid #DDD;
      display: inline-block;
      width: 256px;
      height: 256px;
    }
    #flower {
      border: 1px solid #DDD;
    }
    pre {
      padding: 10px;
      background: #EEE;
      border: 1px solid #DDD;
      border-radius: 5px;
    }
    table td {
      vertical-align: top;
    }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr><td>Original</td><td>Upscaled</td></tr>
    </thead>
    <tbody>
      <tr><td>
      <img src="./fixture.png" id="fixture" />
        </td>
      <td>
        <div id="target">

        </div>
      </td>
    </tr>
      </tbody>
    </table>
    <script src="./index.js" type="module"></script>
  </body>
</html>

`;

const getStackBlitz = () => `
{
  "installDependencies": true,
  "startCommand": "npm run dev"
}
`;
const getPackageJSONFile = (model: string) => `
{
  "name": "@upscalerjs/demo.${model}",
  "private": true,
  "version": "1.0.0-beta.1",
  "main": "index.js",
  "scripts": {
    "dev": "vite"
  },
  "devDependencies": {
    "vite": "*"
  },
  "author": "Kevin Scott",
  "license": "MIT",
  "dependencies": {
    "@tensorflow/tfjs": "^4.2.0",
    "seedrandom": "^3.0.5",
    "@upscalerjs/${model}": "^0.1.0",
    "upscaler": "^1.0.0-beta.8"
  },
  "engines": {
    "npm": ">8.0.0"
  }
}`;

const writeDemoFile = async (model: string, file: string, contents: string) => {
  const demoRoot = path.resolve(MODELS_DIR, model, 'demo');
  await writeFile(path.resolve(demoRoot, file), contents.trim(), 'utf-8');
}

const writeDemoFiles = (model: string) => Promise.all([
  ['index.js', getIndexJSFile(model)],
  ['index.html', getIndexHTMLFile(model)],
  ['package.json', getPackageJSONFile(model)],
  ['.stackblitzrc', getStackBlitz()],
].map(([file, contents]) => writeDemoFile(model, file, contents)));

/****
 * Main function
 */

const createModelDemo = async (
  model: string,
) => {
  await makeDemoFolder(model);
  await copyFixture(model);
  await writeDemoFiles(model);
}

export default createModelDemo;

/****
 * Functions to expose the main function as a CLI tool
 */

interface Answers { 
  model: string;
}

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs.command('create model demo', '', yargs => {
    yargs.positional('model', {
      describe: 'The model demo to create',
    });
  })
    .help()
    .argv;

  return {
    model: argv._[0] as string,
  }

}

if (require.main === module) {
  (async () => {
    const { model } = await getArgs();
    await createModelDemo(model);
  })();
}
