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

<small className="gray">Defined in <a target="_blank" href="https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/upscaler.ts#L111">upscaler.ts:111</a></small>

## Parameters

- **`image`**: _GetImageAsTensorInput_  - the image to upscale.
- **`options`**: _[TempUpscaleArgs](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/types.ts#L64)_  - a set of upscaling arguments
  - **`output?`**: _COMING SOON_
  - **`progressOutput?`**: _COMING SOON_
  - **`patchSize?`**: _number_
  - **`padding?`**: _number_
  - **`progress?`**: _P_
  - **`signal?`**: _AbortSignal_

## Returns

`Promise<UpscaleResponse>` - an upscaled image.