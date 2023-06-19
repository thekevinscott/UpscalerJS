# Warming up models

<a class="docs-link" href="https://upscalerjs.com/documentation/guides/browser/performance/warmup">View this page on the UpscalerJS website</a>

This guide demonstrates how to make calls to UpscalerJS process faster.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/warmup?file=index.js&title=UpscalerJS: Warmup Example">Open in Stackblitz</a>.

## Motivation

The first time a model is run in Tensorflow.js, [its inference speed can be slow](https://www.tensorflow.org/js/guide/platform_environment#shader_compilation_texture_uploads):

> TensorFlow.js executes operations on the GPU by running WebGL shader programs. These shaders are assembled and compiled lazily when the user asks to execute an operation. The compilation of a shader happens on the CPU on the main thread and can be slow. TensorFlow.js will cache the compiled shaders automatically, making the second call to the same operation with input and output tensors of the same shape much faster. Typically, TensorFlow.js applications will use the same operations multiple times in the lifetime of the application, so the second pass through a machine learning model is much faster.

If we know we'll be doing multiple upscales, we can first warm up our model, which will make subsequent upscaling operations much faster.

## Code

We can warm up an UpscalerJS model by calling `warmup`:

```javascript
import Upscaler from 'upscaler'

const upscaler = new Upscaler()

upscaler.warmup({ patchSize: 64, padding: 2 }).then(() => {
  console.log('All warmed up')
})
```

[`warmup` can be called a few different ways](/documentation/api/warmup).

### Explicit patch size and padding

We can pass an object with a specific patch size and padding, like:

```javascript
upscaler.warmup({ patchSize: 64, padding: 2 })
```

We can also pass this as an array if we need to warm up multiple sizes, like:

```javascript
upscaler.warmup([{ patchSize: 64, padding: 2 }, { patchSize: 32, padding: 2 }])
```

### Numeric sizes

Alternatively, we can explicitly provide the width and height as numbers (width first):

```javascript
upscaler.warmup([64, 64])
```

We can also pass this as an array if we need to warm up multiple sizes, like:

```javascript
upscaler.warmup([[64, 64], [32, 32]])
```
