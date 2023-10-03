---
title: execute
sidebar_position: 1
sidebar_label: execute
---

# `execute`

Processes a given image through a specified neural network. 

Alias for [`upscale`](upscale).

## Example

```javascript
const upscaler = new Upscaler();
const image = new Image();
image.src = '/some/path/to/image.png';

upscaler.execute(image, {
  output: 'base64',
  patchSize: 64,
  padding: 2,
  progress: (progress) => {
    console.log('Progress:', progress);
  },
}).then(enhancedSrc => {
  console.log(enhancedSrc);
});
```

<small className="gray">Defined in <a target="_blank" href="https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/upscaler.ts#L135">upscaler.ts:135</a></small>

## Parameters

- **image**: `Input`  - The image to enhance
- **options**:  - A set of enhancing arguments.
  - **signal?**: `AbortSignal`  - Provides a mechanism to abort the warmup process. [For more, see the guides on cancelling requests](/documentation/guides/browser/usage/cancel).
  - **awaitNextFrame?**: `boolean`  - If provided, upscaler will await `tf.nextFrame()` on each cycle. This allows enhancement operations to more often release the UI thread, and can make enhancement operations more responsive to abort signals or.
  - **output?**: `base64 | tensor`  - Denotes the kind of response UpscalerJS returns - a base64 string representation of the image, or the tensor. In the browser, this defaults to `"base64"` and in Node.js, to `"tensor"`.
  - **patchSize?**: `number`  - Optionally specify an image patch size to operate on. [For more, see the guide on patch sizes](/documentation/guides/browser/performance/patch-sizes).
  - **padding?**: `number`  - Optionally specify a patch size padding. [For more, see the guide on patch sizes](/documentation/guides/browser/performance/patch-sizes).
  - **progress?**: [`Progress`](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/types.ts#L36)  - An optional progress callback if `execute` is called with a `patchSize` argument. [For more, see the guide on progress callbacks](/documentation/guides/browser/usage/progress).
  - **progressOutput?**: `base64 | tensor`  - Denotes the kind of response UpscalerJS returns within a `progress` callback.

## Returns

`Promise<Tensor3D | string>` - an enhanced image.