---
title: warmup
sidebar_position: 3
sidebar_label: warmup
---

# `warmup`

Warms up an Upscaler instance. For more info, [see the guide on warming up](/documentation/guides/browser/performance/warmup).

## Example

```javascript
const upscaler = new Upscaler();
upscaler.warmup([{
  patchSize: 64,
  padding: 2,
}]).then(() => {
  console.log('All warmed up!');
});
```

<small className="gray">Defined in <a target="_blank" href="https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/upscaler.ts#L195">upscaler.ts:195</a></small>

## Parameters

- **warmupSizes**: [`WarmupSizes`](#warmupsizes)  - Denotes how to warm the model up.
- **options?**:  - A set of warm up arguments.
  - **signal?**: `AbortSignal`  - Provides a mechanism to abort the warmup process. [For more, see the guides on cancelling requests](/documentation/guides/browser/usage/cancel).
  - **awaitNextFrame?**: `boolean`  - If provided, upscaler will await `tf.nextFrame()` on each cycle. This allows enhancement operations to more often release the UI thread, and can make enhancement operations more responsive to abort signals or.

### `WarmupSizes`
- `number` - a number representing both the size (width and height) of the patch.
- `{patchSize: number; padding?: number}` - an object with the `patchSize` and optional `padding` properties.
- `number[]` - an array of numbers representing the size (width and height) of the patch.
- `{patchSize: number; padding?: number}[]` - an array of objects with the `patchSize` and optional `padding` properties.

## Returns

`Promise<void>`