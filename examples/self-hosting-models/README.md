# Self Hosting Models

Demonstrates how to self host a model with UpscalerJS.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/basic?file=index.js&title=UpscalerJS: Self Hosting Models">Open example in Stackblitz</a>.

:::tip

If you're looking for a guide on how to host your own models in a Node environment, [check out the Node-specific guide](../../node/nodejs-custom-models).

:::

## Background

UpscalerJS provides support for loading models via the local filesystem. This might be useful when wanting to host the models locally (perhaps when running offline), _or_ for when wanting to integration a custom model with UpscalerJS.

:::note

This example uses the raw 2x `model.json` available via the `esrgan-slim` package to demonstrate.

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

const upscaler = new Upscaler({
  model: {
    scale: 2,
    path: '/model.json',
    preprocess: input => tf.tidy(() => tf.mul(input, 1 / 255)),
    postprocess: output => tf.tidy(() => output.clipByValue(0, 255)),
  }
})
```

`preprocess` and `postprocess` are functions called on the input and output tensors, respectively.

The model can also define a function that returns a `ModelDefinition`, which can be helpful for defining custom layers and ops:

```javascript
import Upscaler from 'upscaler'

const getModelDefinition = (
  /**
   * tf refers to the currently active Tensorflow.js library, which may be 
   * @tensorflow/tfjs, @tensorflow/tfjs-node, or @tensorflow/tfjs-node-gpu.
   **/
  tf,
) => {
  class CustomLayer extends Layer {
    call(inputs: Inputs) {
      ... some definition ...
    }

    static className = 'CustomLayer'
  }

  tf.serialization.registerClass(CustomLayer);
  
  return {
    scale: 2,
    path: '/model.json',
    preprocess: input => tf.tidy(() => tf.mul(input, 1 / 255)),
    postprocess: output => tf.tidy(() => output.clipByValue(0, 255)),
  }
}

const upscaler = new Upscaler({
  model: getModelDefinition,
})
```

We can see an example of [two custom models defined in the `esrgan-thick` model package](https://github.com/thekevinscott/UpscalerJS/blob/main/models/esrgan-thick/src/utils/getModelDefinition.ts#L14).
