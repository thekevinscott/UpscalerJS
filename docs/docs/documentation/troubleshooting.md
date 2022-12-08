---
title: Troubleshooting
description: Troubleshooting
sidebar_position: 5
---

# Troubleshooting

## Padding is undefined

If specifying a patch size but not padding, you will likely encounter artifacting in the upscaled image.

![Image with artifacting](./assets/image-with-artifacting.png)

Most of the time, this artifacting is undesired. To resolve the artifacting, add an explicit padding:

```javascript
upscaler.upscale('/path/to/img', {
  patchSize: 64,
  padding: 4,
})
```

![Image with artifacting](./assets/image-without-artifacting.png)

If you would like to keep artifacting but hide the warning message, pass an explicit padding value of 0:

```javascript
upscaler.upscale('/path/to/img', {
  patchSize: 64,
  padding: 0,
})
```

## Progress Specified Without Patch Size

If you've specified a `progress` callback but are not specifying `patchSize` in the call to `upscale`, the `progress` callback will never be called. `progress` callbacks only occur when `patchSize` is provided.

In order to have your `progress` callback be called, provide explicit patch sizes:

```javascript
upscaler.upscale('/path/to/img', {
  patchSize: 64,
  progress: ...
})
```
