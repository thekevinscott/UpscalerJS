---
sidebar_position: 4
hide_table_of_contents: true
parent: performance
code_embed:
  type: 'stackblitz'
  url: '/examples/patch-sizes'
---

# Patch Sizes

Demonstrates the use of patch sizes with UpscalerJS.

<a href="https://stackblitz.com/github/thekevinscott/upscalerjs/tree/main/examples/patch-sizes?file=index.js&title=UpscalerJS: Patch Sizes">Open in Stackblitz</a>.

## Background & Motivation behind Patch Sizes

Inference requests of Tensorflow.js models are synchronous and blocking, which can make incorporating them into UI operations tricky. Attempting to upscale a particularly large image, or running UpscalerJS on older hardware, can result in a hung UI, in worst cases, even crash a user's browser. We don't want that!

A solution is to slice the upcoming image into pieces and upscale each one individually.

![Demonstration of splitting an image into patches](../../../assets/splitting-image.gif)

However, upscaling models have a tendency to perform poorly on edges, resulting in noticeable artifacting:

![Demonstration of artifacting along the sides of patch sizes](../../../assets/artifacting.gif)

A solution is to add a bit of _padding_ to each patch size, and then slice off the resulting padding when stitching our image back together. Here's what that looks like if we _don't_ slice our padding off:

![Demonstration of using padding but not slicing it off](../../../assets/padding.gif)

## Code

UpscalerJS provides an easy mechanism for working with patch sizes, no math required.

Simply specify your patch size and padding in the request to upscale:

```javascript
import Upscaler from 'upscaler'
import image from '/path/to/image.png'
const upscaler = new Upscaler()
upscaler.upscale(image, {
  patchSize: 32,
  padding: 2,
})
```

A `padding` of `2` or greater is generally sufficient to avoid noticeable artifacting.

If you do not explicitly provide a `padding` argument, UpscalerJS will emit a warning. Generally, a `patchSize` argument should always be accompanied by a `padding` to avoid the artifacting demonstrated above. If you wish to avoid this warning, you can pass an explicit argument of `0` as the padding:

```javascript
upscaler.upscale(image, {
  patchSize: 32,
  padding: 0,
})
```
