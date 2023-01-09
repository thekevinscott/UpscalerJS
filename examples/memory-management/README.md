# Memory Management

This guide demonstrates additional techniques for managing memory when using UpscalerJS.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/memory-management?file=index.js&title=UpscalerJS: Memory Management">Open in Stackblitz</a>.

## Disposing of an UpscalerJS Instance

:::caution

The most important consideration about memory is to **dispose of tensors**. If you provide a tensor, or specify a `tensor` as the return type, you are responsible for disposing of the tensor. [Read more about that here](../tensors#managing-memory). (Any tensors _not_ explicitly specified, UpscalerJS will clear for you.)

:::

If working with multiple upscalers within a page, we may want to clean up upscaler instances when done with them. We can do so with the below:

```javascript
import Upscaler from 'upscaler'
const upscaler = new Upscaler()

upscale.dispose().then(() => {
  console.log('I am all cleaned up')
})
```

`dispose` will return a promise that resolves once all memory is freed up. All inflight upscale requests will be aborted.

Next we can learn about additional arguments and methods that we can use to interact with an UpscalerJS instance.
