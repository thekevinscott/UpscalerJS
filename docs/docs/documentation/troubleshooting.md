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

## Unexpected Token

If you're in a Node.js environment, you may encounter something like this:

```
/node_modules/upscaler/dist/browser/esm/index.js:1
export { default, } from './upscaler';
^^^^^^

SyntaxError: Unexpected token 'export'
```

This likely means one of two things:

- You are using `upscaler`, instead of `upscaler/node`; [check out the guide on Node.js here](/documentation/guides/node/nodejs).
- You are using `import` syntax instead of `require` syntax; if so, try switching to `require('upscaler')`. For more information on this, [see this Github issue](https://github.com/thekevinscott/UpscalerJS/issues/554#issuecomment-1344108954).

## Missing Model Path

If you see an error like:

```
Uncaught (in promise) Error: You must provide a "path" when providing a model definition
```

You've passed a `null` or `undefined` path argument in the `model` argument to UpscalerJS:

```javascript
const upscaler = new Upscaler({
  model: {
    path: null,
  },
})
```

Ensure you pass a valid `path` argument in the `model` payload. [See the guide on models for more information](/documentation/guides/browser/models).

## Missing Model Scale

If you see an error like:

```
Uncaught (in promise) Error: You must provide a "scale" when providing a model definition
```

You've passed a `null` or `undefined` scale argument in the `model` argument to UpscalerJS:

```javascript
const upscaler = new Upscaler({
  model: {
    scale: null,
  },
})
```

Every model must have an explicit `scale` defined.

Ensure you pass a valid `scale` argument in the `model` payload. [See the guide on models for more information](/documentation/guides/browser/models).

## Invalid Warmup Value

If you see an error like:

```
Uncaught (in promise) Error: Invalid value passed to warmup in warmupSizes: foo
```

It means you've called `.warmup` with an invalid value:

```javascript
upscaler.warmup('foo')
```

Ensure you're passing one of the following:

- `{ patchSize: number; padding: number }`
- `[width, height]`
- `{ patchSize: number; padding: number }[]`
- `[width, height][]`

For more information, [see the guide on warm ups](/documentation/guides/browser/performance/warmup), or review the [API documentation on the `warmup` method](/documentation/api/warmup).
