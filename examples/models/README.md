---
sidebar_position: 2
hide_table_of_contents: true
code_embed:
  type: 'stackblitz'
  url: '/examples/models'
---

# Models

Discusses how models work in UpscalerJS.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/basic?file=index.js&title=UpscalerJS: Models">Open example in Stackblitz</a>.

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

We'll need to decide what _scale_ model we wish to use. The larger the scale, generally the less accurate the resulting upscaled image will be.

import SampleTable from '@site/src/components/sampleTable/sampleTable';

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
import x2 from '@upscalerjs/esrgan-thick/2x';
```

And we can then pass the model as an argument to our upscaler:

```javascript
import Upscaler from 'upscaler';
const upscaler = new Upscaler({
  model: x2,
})
```

The resulting image will be upscaled using the `esrgan-thick` model.
