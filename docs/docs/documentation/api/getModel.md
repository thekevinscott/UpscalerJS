---
title: getModel
sidebar_position: 5
sidebar_label: getModel
---

# getModel

Gets a model package.

## Example

```javascript
const upscaler = new Upscaler();
upscaler.getModel().then(modelPackage => {
  console.log(modelPackage);
})
```

## Returns

`Promise<ModelPackage>` - a modelPackage object of shape ```{ model: tf.LayersModel, modelDefinition: ModelDefinition }```