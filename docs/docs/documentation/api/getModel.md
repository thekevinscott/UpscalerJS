---
title: getModel
sidebar_position: 6
sidebar_label: getModel
---

# `getModel`

Gets a model package.

## Example

```javascript
const upscaler = new Upscaler();
upscaler.getModel().then(modelPackage => {
  console.log(modelPackage);
})
```

<small className="gray">Defined in <a target="_blank" href="https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/upscaler.ts#L251">upscaler.ts:251</a></small>

## Returns

`Promise<ModelPackage>` - a modelPackage object of shape ```{ model: tf.LayersModel, modelDefinition: ModelDefinition }```