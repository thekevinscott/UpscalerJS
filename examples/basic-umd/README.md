---
sidebar_position: 2
hide_table_of_contents: true
code_embed:
  type: 'stackblitz'
  url: '/examples/basic-umd'
  params: embed=1&file=index.js,index.html&hideExplorer=1
---

# Usage with Script Tag

Demonstrates installing UpscalerJS with a script tag.

This guide is identical to [basic](basic), except that instead of UpscalerJS being installed via NPM, it is instead imported via a script tag.

Check out the HTML file where the script tags are imported:

```
  <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@2.0.0/dist/tf.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/upscaler@latest/dist/browser/umd/upscaler.min.js"></script>
```

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/basic-umd?file=index.js&title=UpscalerJS: Basic Implementation using a Script Tag">Open example in Stackblitz</a>.
