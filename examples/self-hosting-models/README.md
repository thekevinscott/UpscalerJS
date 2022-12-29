---
sidebar_position: 3
hide_table_of_contents: true
parent: usage
code_embed:
  type: 'stackblitz'
  url: '/examples/self-hosting-models'
---

# Self Hosting Models

Demonstrates how to self host a model with UpscalerJS.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/basic?file=index.js&title=UpscalerJS: Self Hosting Models">Open example in Stackblitz</a>.

:::tip

If you're looking for a guide on how to host your own models in a Node environment, [check out the Node-specific guide](../../node/nodejs-custom-models).

:::

## Background

UpscalerJS provides support for loading models via the local filesystem. This might be useful when we want to host the models ourselves (perhaps we're running offline), _or_ if we have a custom model we wish to integrate with UpscalerJS.

:::note

In this example, we'll be using the raw 2x `model.json` available via the `esrgan-slim` package to demonstrate.

:::

## Code

We first need to ensure that our model file is accessible locally via a URL, [as Tensorflow.js requires a HTTP-compatible model file](https://www.tensorflow.org/js/guide/save_load#https). In our example, we're using [`vite`](https://vitejs.dev/), which automatically exposes the `public` folder statically. Therefore, we've placed our model files into the `public` folder which has made them accessible at `/model.json`.

We can then specify the model with a custom `model` attribute:

```javascript
import Upscaler from 'upscaler'

const upscaler = new Upscaler({
  model: {
    scale: 2,
    path: '/model.json',
  }
})
```

Both `scale` and `path` are required options. Models are tied to a specific scale which must be specified per model.

## Model options

We can further specify our model with additional configuration options:

```javascript
import Upscaler from 'upscaler'

class CustomLayer extends Layer {
  call(inputs: Inputs) {
    ... some definition ...
  }

  static className = 'CustomLayer';
}

const upscaler = new Upscaler({
  model: {
    scale: 2,
    path: '/model.json',
    preprocess: input => tf.tidy(() => tf.mul(input, 1 / 255)),
    postprocess: output => tf.tidy(() => output.clipByValue(0, 255)),
    customLayers: [CustomLayer]
  }
})
```

`preprocess` and `postprocess` are functions called on the input and output tensors, respectively.

[`customLayers` allows us to define custom layers for our model](https://www.tensorflow.org/js/guide/models_and_layers#custom_layers). We can see an example of [two custom models defined in the `esrgan-thick` model package](https://github.com/thekevinscott/UpscalerJS/blob/main/models/esrgan-thick/src/utils/getModelDefinition.ts#L14).
