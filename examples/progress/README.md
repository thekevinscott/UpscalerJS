---
sidebar_position: 20 
hide_table_of_contents: true
parent: usage
code_embed:
  type: 'stackblitz'
  url: '/examples/progress'
---

# Monitoring Progress

It can be useful to monitor the progress of an upscale operation, particularly for larger images or heavier models. UpscalerJS provides an easy way to do so.

## Code

:::info

`progress` will _only_ be called if a `patchSize` is set during an upscale. [Read more about patch sizes here](../performance/patch-sizes).

:::

We can pass a callback function to the upscale method that will call back on any progress operations:

```javascript
import Upscaler from 'upscaler'
import image from '/path/to/image.png'

const upscaler = new Upscaler()

upscaler.upscale(image, {
  progress: (percent) => {
    console.log(`${percent}% of image has been processed`)
  }
})
```

## Callback Function

In addition to returning you the percentage of operation completed, the `progress` callback can accept a few positional other arguments. The full list of arguments is:

* `percent` - The percentage of the upscale operation completed
* `imageSlice` - the 
