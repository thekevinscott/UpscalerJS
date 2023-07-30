# Self Hosting Models

<a class="docs-link" href="https://upscalerjs.com/documentation/guides/browser/usage/self-hosting-models">View this page on the UpscalerJS website</a>

Demonstrates how to self host a model with UpscalerJS.

<a href="https://githubbox.com/thekevinscott/upscalerjs/tree/main/examples/self-hosting-models?file=index.js&title=UpscalerJS: Self Hosting Models">Open example in Codesandbox</a>.

:::tip

If you're looking for a guide on how to host your own models in a Node environment, [check out the Node-specific guide](../../node/nodejs-custom-file-path).

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

`path` is a required option.

We can also further specify our model with additional configuration options. See the guide on [custom model configurations](custom-model-configurations) for more information.
