# Custom Models

<a class="docs-link" href="https://upscalerjs.com/documentation/guides/browser/usage/custom-model-configurations">View this page on the UpscalerJS website</a>

Demonstrates how to write a custom model configuration for usage with UpscalerJS.

<a href="https://githubbox.com/thekevinscott/upscalerjs/tree/main/examples/custom-model-configurations?file=index.js&title=UpscalerJS: Self Hosting Models">Open example in Codesandbox</a>.

:::tip

If you're looking for a guide on how to host your own models in a Node environment, [check out the Node-specific guide](../../node/nodejs-custom-file-path).

:::

## Background

UpscalerJS provides support for custom model configurations.

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
    path: '/model.json',
  }
})
```

`path` is a required option.

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

The model can also define `setup` and `teardown` functions, which can be helpful for defining custom layers and ops, and disposing of memory:

```javascript
import Upscaler from 'upscaler'

const upscaler = new Upscaler({
  model: {
    scale: 2,
    path: '/model.json',
    preprocess: input => tf.tidy(() => tf.mul(input, 1 / 255)),
    postprocess: output => tf.tidy(() => output.clipByValue(0, 255)),
      /**
       * tf refers to the currently active Tensorflow.js library, which may be 
       * @tensorflow/tfjs, @tensorflow/tfjs-node, or @tensorflow/tfjs-node-gpu.
       **/
    setup: async (tf) => {
      class CustomLayer extends Layer {
        call(inputs: Inputs) {
          ... some definition ...
        }

        static className = 'CustomLayer'
      }

      tf.serialization.registerClass(CustomLayer);
    },
    teardown: async (tf) => {
      // release some memory
    }
  },
})
```

We can see an example of [two custom models defined in the `esrgan-thick` model package](https://github.com/thekevinscott/UpscalerJS/blob/main/packages/shared/src/esrgan/esrgan.ts#L105).
