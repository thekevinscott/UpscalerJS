---
title: Getting Started
sidebar_position: 2
sidebar_label: Getting Started
---

# Getting Started

## Quick Start

```javascript
// browser-only; see below for Node.js instructions
import Upscaler from 'upscaler'; 
const upscaler = new Upscaler();
upscaler.upscale('/image/path').then(upscaledSrc => {
  // base64 representation of image src
  console.log(upscaledSrc);
});
```

## Browser Setup

In the browser, you can install UpscalerJS via a script tag or by installing via NPM and using a build tool like webpack, parcel, or rollup.

:::tip

For runnable code examples, check out [the guide on Script Tag Installation](/documentation/guides/browser/basic-umd) and [the guide on installation via NPM](/documentation/guides/browser/basic-npm).

:::

### Usage via Script Tag

First, [ensure you've followed the instructions to install Tensorflow.js](https://www.tensorflow.org/js/tutorials/setup).

Then add the following tags to your HTML file:

```HTML
<script src="https://cdn.jsdelivr.net/npm/@upscalerjs/default-model@latest/dist/umd/index.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/upscaler@latest/dist/browser/umd/upscaler.min.js"></script>
```

`Upscaler` will be available globally on your page. To use:

```javascript
<script type="text/javascript">
  const upscaler = new Upscaler({
    model: DefaultUpscalerJSModel,
  })
</script>
```

For a runnable code example, [check out the guide on script tag usage](/documentation/guides/browser/basic-umd).

### Installation from NPM

You can install UpscalerJS from NPM. Ensure Tensorflow.js is installed alongside it.

```bash
npm install upscaler @tensorflow/tfjs
```

To use:


```javascript
import Upscaler from 'upscaler'
const upscaler = new Upscaler()
```

You can install specific models with NPM as well:

```bash
npm install @upscalerjs/esrgan-thick
```

[A full list of official models is available here](/models). You can also use custom models others have trained.

For a runnable code example, [check out the guide on NPM usage](/documentation/guides/browser/basic-npm).

## Node

Install UpscalerJS and the targeted platform of Tensorflow.js. [You can also install specific models](/models).

:::tip

For a runnable code example, check out [the guide on Node.js usage](/documentation/guides/node/nodejs).

:::

### tfjs-node

```bash
npm install upscaler @tensorflow/tfjs-node
```

To use:

```javascript
const Upscaler = require('upscaler/node');
const upscaler = new Upscaler();
upscaler.upscale('/image/path').then(upscaledSrc => {
  // base64 representation of image src
  console.log(upscaledSrc);
});
```

### tfjs-node-gpu

```bash
npm install upscaler @tensorflow/tfjs-node-gpu
```

To use:

```javascript
const Upscaler = require('upscaler/node-gpu');
const upscaler = new Upscaler();
upscaler.upscale('/image/path').then(upscaledSrc => {
  // base64 representation of image src
  console.log(upscaledSrc);
});
```

## Usage

### Instantiation

By default, when UpscalerJS is instantiated, it uses the default model, [`@upscalerjs/default-model`](https://npmjs.com/package/@upscalerjs/default-model). You can install alternative models by installing them and providing them as an argument. 

:::tip

For a runnable code example, check out [the guide on providing models](/documentation/guides/browser/models).

:::

For instance, to use `@upscalerjs/esrgan-legacy`, you'd first install it:

```sh
npm install @upscalerjs/esrgan-legacy
```

And then import and provide it:

```javascript
import Upscaler from 'upscaler';
import GANS from '@upscalerjs/esrgan-legacy/gans';
const upscaler = new Upscaler({
  model: GANS,
});
```

[A full list of models can be found here](/models).

Alternatively, you can provide a path to a pre-trained model of your own:

```javascript
const upscaler = new Upscaler({
  model: {
    path: '/path/to/model',
    scale: 2,
  },
});
```

When providing your own model, **you must provide an explicit scale**.

[See the API documentation for a model definition here](/documentation/api/constructor#parameters).

### Upscaling

You can upscale an image with the following code:

```javascript
upscaler.upscale('/path/to/image').then(img => {
  console.log(img);
});
```

In the browser, you can provide the image in any of the following formats:

* `string` - A URL to an image. Ensure the image can be loaded (for example, make sure the site's CORS policy allows for loading).
* `tf.Tensor3D` or `tf.Tensor4D` - A tensor representing an image.
* [Any valid input to `tf.browser.fromPixels`](https://js.tensorflow.org/api/latest/#browser.fromPixels)

In Node, you can provide the image in any of the following formats:

* `string` - A path to a local image, _or_ if provided a string that begins with `http`, a URL to a remote image.
* `tf.Tensor3D` or `tf.Tensor4D` - A tensor representing an image.
* `Uint8Array` - a `Uint8Array` representing an image.
* `Buffer` - a `Buffer` representing an image.

By default, a base64-encoded `src` attribute is returned. You can change the output type like so:

```javascript
upscaler.upscale('/path/to/image', {
  output: 'tensor',
}).then(img => {
  console.log(img);
});
```

The available types for output are:

* `src` - A src URL of the upscaled image.
* `tf.Tensor3D` - The raw tensor.

#### Performance

For larger images, attempting to run inference can impact UI performance.

:::tip

For runnable code examples, check out [the guide on patch sizes](/documentation/guides/browser/performance/patch-sizes).

:::

To address this, you can provide a `patchSize` parameter to infer the image in "patches" and avoid blocking the UI. You will likely also want to provide a `padding` parameter:

```javascript
({
  patchSize: 64,
  padding: 5,
})
```

Without padding, images will usually end up with unsightly artifacting at the seams between patches. You should use as small a padding value as you can get away with (usually anything above 3 will avoid artifacting).

Smaller patch sizes will block the UI less, but also increase overall inference time for a given image.
