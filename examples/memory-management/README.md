---
sidebar_position: 7
hide_table_of_contents: true
parent: performance
code_embed:
  type: 'stackblitz'
  url: '/examples/memory-management'
---

# Memory Management

This guide demonstrates additional techniques for managing memory when using UpscalerJS.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/memory-management?file=index.js&title=UpscalerJS: Memory Management">Open in Stackblitz</a>.

## Code

:::caution

The most important consideration about memory is to clear tensors. If you provide a tensor, or specify a `tensor` as the return type, you are responsible for disposing of the tensor. [Read more about that here](../tensors/). (Any tensors _not_ explicitly specified, UpscalerJS will clear for you.)

:::

If you are working with multiple upscalers within a page, you may want to clean up upscalers when done with them. You can do so with the below:

```javascript
import Upscaler from 'upscaler';
const upscaler = new Upscaler()

upscale.dispose().then(() => {
  console.log('I am all cleaned up')
})
```

`dispose` will return a promise that resolves once all memory is freed up. All inflight upscale requests will be aborted.
