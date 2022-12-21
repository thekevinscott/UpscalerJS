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

## Returns

`Promise<void>`