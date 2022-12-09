---
title: dispose
sidebar_position: 4
sidebar_label: dispose
---

# dispose

Disposes of an UpscalerJS instance and clears up any used memory.

## Example

```javascript
const upscaler = new Upscaler();
upscaler.dispose().then(() => {
  console.log("I'm all cleaned up!");
})
```

<small className="gray">Defined in <a target="_blank" href="https://github.com/thekevinscott/UpscalerJS/tree/main/packages/upscalerjs/src/upscaler.ts#L165">upscaler.ts:165</a></small>

## Returns

`Promise<void>`