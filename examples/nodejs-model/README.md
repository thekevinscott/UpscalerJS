# Node.js Model Guide

<a class="docs-link" href="https://upscalerjs.com/documentation/guides/node/nodejs-model">View this page on the UpscalerJS website</a>

Demonstration of loading a model in Node.js.

<a href="https://githubbox.com/thekevinscott/upscalerjs/tree/main/examples/nodejs-model">Open in CodeSandbox</a>.

## Motivation

UpscalerJS uses the `default-model` as its default, which is tuned to run quickly at the cost of inference accuracy. This is great for the browser, but we'll probably want something more accurate for the server.

UpscalerJS offers a number of [models](/models#models-1) for download and installation, depending on the use case. 

## Installing

In this example, [we'll use `esrgan-thick`](/models/available/upscaling/esrgan-thick), the most performant model. Install the model with:

```bash
npm install @upscalerjs/esrgan-thick
```

## Code

We'll need to decide what _scale_ model we wish to use. The larger the scale, generally the less accurate the resulting upscaled image will be.

import SampleTable from '@site/src/components/sampleTable/sampleTable'

<SampleTable
  packageName="esrgan-thick"
  models={[
    '2x',
    '3x',
    '4x',
  ]}
  scales={[
    2,
    3,
    4,
  ]}
/>

We'll use the 2x scale model. We can import the specific model with:

```javascript
const x2 = require('@upscalerjs/esrgan-thick/2x')
```

And we can then pass the model as an argument to our upscaler:

```javascript
const Upscaler = require('upscaler/node')
const upscaler = new Upscaler({
  model: x2,
})
```

The resulting image will be upscaled using the `esrgan-thick` model.

## How Models are Loaded in Node.js

Unlike in the browser, where models need to be available via a URL, in Node.js UpscalerJS will attempt to load models from the local filesystem's appropriate `node_modules` folder.
