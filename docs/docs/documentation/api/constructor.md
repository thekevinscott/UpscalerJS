---
title: constructor
sidebar_position: 0
sidebar_label: constructor
---

# constructor

Instantiates an instance of UpscalerJS.

## Example

```javascript
import Upscaler from 'upscaler';
import x2 from '@upscalerjs/models/esrgan-thick/2x';

const upscaler = new Upscaler({
  model: x2,
  warmupSizes: [{ patchSize: 64 }],
});
```

<small className="gray">Defined in <a target="_blank" href="https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/upscaler.ts#L77">upscaler.ts:77</a></small>

## Parameters

- **`opts`**: _[UpscalerOptions](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/types.ts#L10)_
  - **`model?`**: _[ModelDefinition](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/core/src/index.ts#L22)_  - Defaults to [`@upscalerjs/default-model`](/models/available/default-model)
      - **`path`**: _string_  - Path to a model.json file.
    - **`scale`**: _number_  - The scale of the model. Must match the scale at which the model was trained.
    - **`preprocess?`**: _[PreProcess](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/core/src/index.ts#L19)_  - A function that processes the input image before feeding to the model. For example, you can use this function if you need to regularize your input.
    - **`postprocess?`**: _[PostProcess](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/core/src/index.ts#L20)_  - A function that processes the input image after being run through model inference. For example, you may need to convert floats to 0-255 integers.
    - **`customLayers?`**: _SerializableConstructor[]_  - Custom layers for the model.
  - **`warmupSizes?`**: _[WarmupSizes[]](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/types.ts#L9)_

## Returns

`Upscaler` - an instance of an UpscalerJS class