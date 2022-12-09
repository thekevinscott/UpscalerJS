---
title: warmup
sidebar_position: 2
sidebar_label: warmup
---

# warmup

Warms up an upscaler instance.

## Example

```javascript
const upscaler = new Upscaler();
upscaler.warmup([{
  patchSize: 64,
}]).then(() => {
  console.log('I am all warmed up!');
});
```

<small className="gray">Defined in <a target="_blank" href="https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/upscaler.ts#L135">upscaler.ts:135</a></small>

## Parameters

- **`warmupSizes`**: _[WarmupSizes[]](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/types.ts#L9)_
- **`options?`**: _[WarmupArgs](https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/types.ts#L66)_
  - **`signal?`**: _AbortSignal_  - [Provides a mechanism to abort the warmup process](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).
  - **`awaitNextFrame?`**: _boolean_  - If provided, upscaler will await `tf.nextFrame()` on each cycle. This can be helpful if you need to release for the UI thread or wish to be more responsive to abort signals.

## Returns

`Promise<void>`