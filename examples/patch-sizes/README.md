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

[Inference requests with Tensorflow.js models are synchronous and blocking](https://js.tensorflow.org/api/latest/#tf.LayersModel.predict), which makes achieving UI responsiveness difficult, particularly with larger images or on older hardware.

A solution is to slice the upcoming image into pieces and upscale each one individually.

<figure>

![Demonstration of splitting an image into patches](../../../assets/splitting-image.gif)

<figcaption>Splitting an image into patches</figcaption>
</figure>

However, upscaling models have a tendency to perform poorly on edges, resulting in noticeable artifacting:

<figure>

![Demonstration of artifacting along the sides of patch sizes](../../../assets/artifacting.gif)

<figcaption>Example of artifacting along the edges of patches</figcaption>
</figure>

A solution is to add a bit of _padding_ to each patch size, and then slice off the resulting padding when stitching our image back together. Here's what that looks like (note, we are explicitly _not_ removing the padding in this demonstration):

<figure>

![Demonstration of using padding but not slicing it off](../../../assets/padding.gif)

<figcaption>Example of adding padding to the image (UpscalerJS slices off the excess padding)</figcaption>
</figure>

UpscalerJS provides an easy mechanism for working with patch sizes, no math required.

## Code

Specify our patch size and padding in the request to upscale:

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

If we do not explicitly provide a `padding` argument, UpscalerJS will emit a warning. Generally, a `patchSize` argument should always be accompanied by a `padding` to avoid the artifacting demonstrated above. To avoid this warning, pass an explicit argument of `0` as the padding:

```javascript
upscaler.upscale(image, {
  patchSize: 32,
  padding: 0,
})
```
