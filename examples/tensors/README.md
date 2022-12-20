---
sidebar_position: 3
hide_table_of_contents: true
code_embed:
  type: 'stackblitz'
  url: '/examples/tensors'
---

# Working with Tensors

Here we'll discuss working with tensors directly within the context of UpscalerJS.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/tensors?file=index.js&title=UpscalerJS: Working with Tensors">Open in Stackblitz</a>.

## Tensors

[Tensors are a data type used in neural networks](https://thekevinscott.com/tensors-in-javascript/), and they're used internally to represent the images being upscaled in UpscalerJS.

UpscalerJS offers convenience methods for simply converting between input formats and returning an easily displayable format depending on browser or node.

However, if you are already working with tensors in the context of your application, it can often be more performant to work directly with tensors throughout the process. Doing so can give finer grained control over memory management and performance.

Here we'll discuss the particulars of working with tensors in UpscalerJS.

## Providing a Tensor

Let's say we've got a tensor that we'd like to upscale.

:::note

For the purposes of this example, we'll create a tensor with `tf.browser.fromPixels`. This is the same method used internally by UpscalerJS, so using this method is redundant unless you have additional steps you wish to perform on your tensor.

:::

```javascript
import flower from '/path/to/flower.png'

const tensor = tf.browser.fromPixels(flower)
// you can inspect this tensor further with:
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

## Receiving a Tensor

We can also receive a tensor as the output of our operation. Similarly to the input steps, doing so will be slightly more performant and give us finer grained control over memory management.

We can specify we wish to receive a tensor response with:

```javascript
upscaler.upscale(tensor, {
  output: 'tensor',
}).then(upscaledTensor => {
  upscaledTensor.print();
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

[Tensorflow.js provides a handy method, `tidy`](https://js.tensorflow.org/api/latest/#tidy), for automatically managing tensor memory within synchronous methods. However, most UpscalerJS methods are asynchronous, so take care not to use `tidy` outside of the context of a synchronous function.

Congratulations! You're upscaling images now. From here, read about some performance optimizations you can take to squeeze the most performance out of UpscalerJS on the browser.
