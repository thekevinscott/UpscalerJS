---
title: constructor
sidebar_position: 0
sidebar_label: constructor
---

# `constructor`

Instantiates an instance of UpscalerJS.

## Example

```javascript
import Upscaler from 'upscaler';
import x2 from '@upscalerjs/models/esrgan-thick/2x';

const upscaler = new Upscaler({
  model: x2,
  warmupSizes: { patchSize: 64 },
});
```

<small className="gray">Defined in <a target="_blank" href="https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/upscaler.ts#L90">upscaler.ts:90</a></small>

## Parameters

- **opts**:
  - **model?**:  - Defaults to [`@upscalerjs/default-model`](/models/available/upscaling/default-model)
      - **modelType?**: [`ModelType`](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/core/src/index.ts#L24)  - The type of the model. Can be 'graph' or 'layer'. Defaults to 'layer'.
    - **path?**: `string`  - Path to a model.json file.
    - **scale?**: `number`  - The scale of the model. For super resolution models, should match the scale at which the model was trained.
    - **preprocess?**: [`PreProcess`](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/core/src/index.ts#L26)  - A function that processes the input image before feeding to the model. For example, you can use this function if you need to regularize your input.
    - **postprocess?**: [`PostProcess`](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/core/src/index.ts#L27)  - A function that processes the input image after being run through model inference. For example, you may need to convert floats to 0-255 integers.
    - **inputRange?**: [`Range`](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/core/src/index.ts#L20)  - Two numbers denoting the range in which the model expects number to be in the range of. Defaults to [0, 255].
    - **outputRange?**: [`Range`](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/core/src/index.ts#L20)  - Two numbers denoting the range in which the model is expected to output its predictions. Numbers can still fall outside of this range, but  UpscalerJS will use the range to clip the values appropriately. Defaults to [0, 255].
    - **divisibilityFactor?**: `number`  - A number denoting whether and how an image should be divisible. For instance, a model may only operate on images that are even (divisible by 2), in which case this would be `2`. Only square sizes are supported for now.
    - **setup?**: [`Setup`](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/core/src/index.ts#L44)  - A function that runs when a model is instantiated. Can be used for registering custom layers and ops.
    - **teardown?**: [`Teardown`](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/core/src/index.ts#L45)  - A function that runs when a model is disposed. Can be used for releasing memory.
  - **warmupSizes?**: [`WarmupSizes`](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/types.ts#L18)

## Returns

`Upscaler` - an instance of an UpscalerJS class.