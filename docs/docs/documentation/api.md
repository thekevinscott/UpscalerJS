---
title: API
description: API
sidebar_position: 4
---

## Usage

### Instantiation

By default, when UpscalerJS is instantiated, it uses the default model, [`@upscalerjs/default-model`](https://npmjs.com/package/@upscalerjs/default-model).

You can install alternative models by installing them and providing them as an argument. For instance, to use `@upscalerjs/esrgan-legacy`, you'd first install it:

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

Currently, the list of models includes:

* `@upscalerjs/default-model`
* `@upscalerjs/esrgan-legacy`

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

[The full model definition is defined here](https://github.com/thekevinscott/UpscalerJS/blob/v1.0.0/packages/core/src/index.ts#L18).

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

For larger images, attempting to run inference can impact UI performance. To address this, you can provide a `patchSize` parameter to infer the image in "patches" and avoid blocking the UI. You will likely also want to provide a `padding` parameter:

```javascript
({
  patchSize: 64,
  padding: 5,
})
```

Without padding, images will usually end up with unsightly artifacting at the seams between patches. You should use as small a padding value as you can get away with (usually anything above 3 will avoid artifacting).

Smaller patch sizes will block the UI less, but also increase overall inference time for a given image.

## API

### `constructor`

Instantiates an instance of UpscalerJS.

#### Example

```javascript
const upscaler = new Upscaler({
  scale: 2,
  warmupSizes: [[256, 256]]
});
```

#### Options

* `model` (`ModelDefinition`) - A configuration of a pretrained model.
* `scale` (`number`) - The scale of the custom pretrained model. Required if providing a custom model. If a pretrained model is specified, providing `scale` will throw an error.
* `warmupSizes` (Optional, `Array<[number, number] | { patchSize: number, padding?: number }`>) - An array of sizes to "warm up" the model. By default, the first inference run will be slower than the rest. This passes a dummy tensor through the model to warm it up. It must match your image size exactly. Sizes are specified as `[width, height]`.

### `upscale`

Accepts an image and returns a promise resolving to the upscaled version of the image.

#### Example

```javascript
upscaler.upscale('/path/to/image', {
  output: 'tensor',
  patchSize: 64,
  padding: 5,
  progress: (amount) => {
    console.log(`Progress: ${amount}%`);
  }
}).then(upscaledImage => {
  ...
});
```

#### Options

* `src` (`str|HTMLImage|tf.Tensor3D`) - Path to the image, or an `HTMLImage` representation of the image, or a 3-dimensional tensor representation of the image.
* `options`
  * `output` (`src|tensor`) - The desired output of the function. Defaults to a base 64 `src` representation.
  * `patchSize` (`number`) - The desired patch size to use for inference.
  * `padding` (`number`) - Extra padding to be applied to the patch size during inference.
  * `progress` (`(amount: number, slice?: src|tensor) => void`) - A progress callback denoting the percentage complete.
  * `progressOutput` (`src|tensor`) - An optional value that sets the return type of the second argument of progress
  * `signal` (`AbortSignal`) - An optional signal that allows cancellation of an in-flight upscale request

The `progress` callback optionally returns a second argument with the processed slice of the image:

```javascript
upscaler.upscale('/path/to/image', {
  output: 'tensor',
  progress: (amount, slice) => {
    // do something with the sliced image
  }
});
```

The `slice` format will be a base64 string or a tensor corresponding to the value of `output`. This can be overridden by providing an additional property, `progressOutput`, of the form `src | tensor` that will override the value set in `output`.

You can cancel an `upscale` request by providing an `AbortSignal`:

```javascript
const abortController = new AbortController();
upscaler.upscale('/path/to/image', {
  signal: abortController.signal,
}).catch(err => {
  // I have been cancelled.
});
abortController.abort();
```

It's worth noting that calls to `model.predict()` in Tensorflow.js cannot be aborted; if you wish to enable the ability to cancel an inflight request, specifying patch sizes will periodically allow the `upscale` request to release and potentially abort.

### `warmup`

If desired, the model can be "warmed up" after instantiation by calling `warmup` directly.

#### Example

```javascript
upscaler.warmup([[256, 256]]).then(() => {
  // all done.
});
```

Or you can provide a patch size and padding:

```javascript
upscaler.warmup([{
  patchSize: 64,
  padding: 5,
}]).then(() => {
  // all done.
});
```

#### Options

* `warmupSizes` (Optional, `Array<[number, number]`>) - An array of sizes to "warm up" the model.

### `getModel`

Gets the underlying model.

#### Example

```javascript
upscaler.getModel().then(model => {
})
```

### `dispose`

Disposes the current model. Must be called to free up memory when the Upscaler is no longer needed.

#### Example

```javascript
await upscaler.dispose();
```

### `abort`

Aborts all inflight `upscale` calls.

#### Example

```javascript
await upscaler.abort();
```
