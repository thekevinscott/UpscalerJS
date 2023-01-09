# Working with Tensors

Here we'll discuss working with tensors directly within the context of UpscalerJS.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/tensors?file=index.js&title=UpscalerJS: Working with Tensors">Open in Stackblitz</a>.

## Tensors

[Tensors are a data type used in neural networks](https://thekevinscott.com/tensors-in-javascript/), and they're used internally to represent the images being upscaled in UpscalerJS.

If we're already working with tensors in the context of our application, it can often be more performant to work directly with tensors throughout the process. Doing so can give finer grained control over memory management and performance.

:::tip

If you stick with the defaults, you won't need to know anything about tensors. UpscalerJS will automatically handle everything for you. This guide is for those wishing to exercise more control over memory and performance.

:::

Here we'll discuss the particulars of working with tensors in UpscalerJS.

## Tensor as Input

Let's say we've got a tensor that we'd like to upscale.

:::note

For the purposes of this example, we'll create a tensor with `tf.browser.fromPixels`. This is the same method used internally by UpscalerJS, so using this method is redundant unless you have additional steps you wish to perform on your tensor.

:::

```javascript
import flower from '/path/to/flower.png'

const tensor = tf.browser.fromPixels(flower)
// inspect this tensor further with:
// tensor.print()
```

We can provide the tensor directly to UpscalerJS for processing, and it will automatically process it:

```javascript
import Upscaler from 'upscaler'

const upscaler = new Upscaler()

upscaler.upscale(tensor).then(upscaledSrc => {
  console.log(upscaledSrc)
})
```

## Tensor as Output

We can also return a tensor in the output of our operation. Doing so will be slightly more performant and give us finer grained control over memory management.

We can specify the return type as `tensor` by providing the `output` argument:

```javascript
upscaler.upscale(tensor, {
  output: 'tensor',
}).then(upscaledTensor => {
  upscaledTensor.print()
})
```

## Managing Memory

Whenever providing a tensor or specifying a `tensor` response, we become responsible for disposing of tensor memory ourselves. We can do this by explicitly calling `tensor.dispose()` on the tensors when we're done with them.

```javascript
upscaler.upscale(tensor, {
  output: 'tensor',
}).then(upscaledTensor => {
  // we are now done with our initial tensor; dispose of its memory
  tensor.dispose()

  // do something with the upscaled tensor
  upscaledTensor.print()

  // dispose of the upscaled tensor
  upscaledTensor.dispose()
})
```

:::caution

[Tensorflow.js provides a handy method, `tidy`](https://js.tensorflow.org/api/latest/#tidy), for automatically managing tensor memory within synchronous methods. However, most UpscalerJS methods are asynchronous, so take care not to use `tidy` outside of the context of a synchronous function.

:::

Next, read about some performance optimizations we can take to squeeze the most performance out of UpscalerJS in the browser.
