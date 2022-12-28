---
sidebar_position: 1
hide_table_of_contents: true
code_embed:
  type: 'stackblitz'
  url: '/examples/basic'
---

# Basic Implementation

Demonstrates a basic implementation of UpscalerJS for the browser.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/basic?file=index.js&title=UpscalerJS: Basic Implementation">Open example in Stackblitz</a>.

## Getting Started

:::info

[You can learn more about available installation methods here](https://upscalerjs.com/documentation/getting-started#browser-setup).

:::

In this example we're using [Vite](https://vitejs.dev/), a development server, and we've installed UpscalerJS via npm.

We can import UpscalerJS with the following:

```javascript
import Upscaler from 'upscaler';
```

We can then instantiate an instance of UpscalerJS with:

```javascript
const upscaler = new Upscaler();
```

## Upscaling an Image

Input images can come in a variety of formats, including URL strings, `<img />` elements, and more. 

:::info

[For a full list of supported image formats, read here](/documentation/api/upscale).

:::

Our input will be a string representing a URL. Provide the string to the `upscale` method with:

```javascript
import pathToImage from '/path/to/image.png';

upscaler.upscale(pathToImage);
```

This will upscale the image and return a promise that resolves to the upscaled image src represented as a base64 string:

```javascript
upscaler.upscale(pathToImage).then(upscaledImageSrc => {
  // Create a new image, set its src to the upscaled src,
  // and place it on the page
  const img = document.createElement("img");
  img.src = upscaledImgSrc;
  document.body.appendChild(img);
});
```

There are a number of options you can pass to the `upscale` method, [detailed here](http://localhost:3000/documentation/api/upscale).

[Next, read about the concept of models and how they work with UpscalerJS](models).
