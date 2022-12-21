---
title: upscale
sidebar_position: 1
sidebar_label: upscale
---

# upscale

Upscales a given image.

## Example

```javascript
const upscaler = new Upscaler();
const image = new Image();
image.src = '/some/path/to/image.png';

upscaler.upscale(image, {
  output: 'base64',
  patchSize: 64,
  padding: 2,
  progress: (progress) => {
    console.log('Progress:', progress);
  },
}).then(upscaledSrc => {
  console.log(upscaledSrc);
});
```

## Parameters

- **`image`**: _GetImageAsTensorInput_  - the image to upscale. If in the browser, this can be a string to a file path, a tensor, or any element tf.fromPixels supports. If in Node, this can be a string to a file path, a Buffer, a Uint8Array, or a tensor.
- **`options`**: _[UpscaleArgs](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/types.ts#L46)_  - a set of upscaling arguments
  - **`signal?`**: _AbortSignal_  - [Provides a mechanism to abort the warmup process](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).
  - **`awaitNextFrame?`**: _boolean_  - If provided, upscaler will await `tf.nextFrame()` on each cycle. This can be helpful if you need to release for the UI thread or wish to be more responsive to abort signals.
  - **`output?`**: _"base64" | "tensor"_
  - **`patchSize?`**: _number_
  - **`padding?`**: _number_
  - **`progress?`**: _[SingleArgProgress | MultiArgProgress](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/types.ts#L33)_
  - **`progressOutput?`**: _"base64" | "tensor"_

## Returns

`Promise<UpscaleResponse>` - an upscaled image.