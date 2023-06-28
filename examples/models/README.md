# Models

<a class="docs-link" href="https://upscalerjs.com/documentation/guides/browser/models">View this page on the UpscalerJS website</a>

This guide discusses how models work in UpscalerJS.

<a href="https://githubbox.com/thekevinscott/upscalerjs/tree/main/examples/models?file=index.js&title=UpscalerJS: Models">Open example in Stackblitz</a>.

## Overview

UpscalerJS upscales images using neural networks trained on specific scales, configured in a variety of architecture sizes

:::info

By default, UpscalerJS uses `default-model`, [which is available here](/models/available/default-model).

:::

UpscalerJS offers a number of [models](/models) for download and installation, depending on the use case. 

## Installing

In this example, [we'll use `esrgan-thick`](/models/available/esrgan-thick), the most performant model. Install the model with:

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
import x2 from '@upscalerjs/esrgan-thick/2x'
```

And we can then pass the model as an argument to our upscaler:

```javascript
import Upscaler from 'upscaler'
const upscaler = new Upscaler({
  model: x2,
})
```

The resulting image will be upscaled using the `esrgan-thick` model.

## How Models are Loaded in the Browser

[Tensorflow.js requires that models be available via a public URL](https://www.tensorflow.org/js/guide/save_load#https). Therefore, UpscalerJS will attempt to load model files via a public CDN. The CDNs UpscalerJS loads from, by order of preference, include:

1. [`jsdelivr`](https://www.jsdelivr.com)
2. [`unpkg`](http://unpkg.com)

:::tip

If you want to avoid a CDN and self-host a model instead(or you've got a custom model) [check out the guide on self hosting](usage/self-hosting-models).

:::
