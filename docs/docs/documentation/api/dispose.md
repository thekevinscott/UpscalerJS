---
title: dispose
sidebar_position: 5
sidebar_label: dispose
---

# `dispose`

Disposes of an UpscalerJS instance and clears up any used memory. Ensure any active execution events have first been aborted before disposing of the model.

## Example

```javascript
const upscaler = new Upscaler();
upscaler.dispose().then(() => {
  console.log("All cleaned up!");
})
```

<small className="gray">Defined in <a target="_blank" href="https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/upscaler.ts#L230">upscaler.ts:230</a></small>

## Returns

`Promise<void>`