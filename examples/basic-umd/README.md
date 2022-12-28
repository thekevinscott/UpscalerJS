---
sidebar_position: 2
hide_table_of_contents: true
code_embed:
  type: 'stackblitz'
  url: '/examples/basic-umd'
  params: embed=1&file=index.html&hideExplorer=1
---

# Usage with Script Tag

Demonstrates installing UpscalerJS with a script tag.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/basic-umd?file=index.js&title=UpscalerJS: Basic Implementation using a Script Tag">Open example in Stackblitz</a>.

## Overview

This guide is identical to the [basic NPM example](basic), except that instead of UpscalerJS being installed via NPM, it is instead imported via a script tag.

Script tags can be added like this:

```html
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@upscalerjs/default-model@1.0.0-beta.12/dist/umd/index.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/upscaler@latest/dist/browser/umd/upscaler.min.js"></script>
```

When using UpscalerJS via a script tag, we _must_ specify a model to use. In this example, we're using the `default-model`:

```javascript
const upscaler = new Upscaler({
  model: DefaultUpscalerJSModel,
});
```

[Read more about models in the next guide](/documentation/guides/browser/models).
