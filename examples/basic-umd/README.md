# Usage with Script Tag

Demonstrates installing UpscalerJS with a script tag.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/basic-umd?file=index.js&title=UpscalerJS: Basic Implementation using a Script Tag">Open example in Stackblitz</a>.

## Overview

This guide is identical to the [basic NPM example](basic-npm), except that instead of UpscalerJS being installed via NPM, it is instead imported via a script tag.

Script tags can be added like this:

```html
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@upscalerjs/default-model@latest/dist/umd/index.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/upscaler@latest/dist/browser/umd/upscaler.min.js"></script>
```

When using UpscalerJS via a script tag, we _must_ specify a model to use. In this example, we're using the `default-model`:

```javascript
const upscaler = new Upscaler({
  model: DefaultUpscalerJSModel,
});
```

[Read more about models in the next guide](/documentation/guides/browser/models).
