---
title: Getting Started
sidebar_position: 2
sidebar_label: Getting Started
---

# Getting Started

## Install

```bash
npm install upscaler
```

[You can upload specific models by specifying the model](/models):

```bash
npm install @upscalerjs/esrgan-thick
```

## Quick Start

### Browser

```javascript
import Upscaler from 'upscaler';
const upscaler = new Upscaler();
upscaler.upscale('/path/to/image').then(upscaledImage => {
  console.log(upscaledImage); // base64 representation of image src
});
```

### Node

In Node, make sure you've installed the appropriate Tensorflow.js package, and import the Node-specific Upscaler package.

If using `@tensorflow/tfjs-node`:

```javascript
import Upscaler from 'upscaler/node';
const upscaler = new Upscaler();
upscaler.upscale('/path/to/image').then(upscaledImage => {
  console.log(upscaledImage); // base64 representation of image src
});
```

If using `@tensorflow/tfjs-node-gpu`:

```javascript
import Upscaler from 'upscaler/node-gpu';
const upscaler = new Upscaler();
upscaler.upscale('/path/to/image').then(upscaledImage => {
  console.log(upscaledImage); // base64 representation of image src
});
```

## Dependencies

If running in the browser, UpscalerJS expects `@tensorflow/tfjs` to be available as a peer dependency.

If running in Node, UpscalerJS expects either `@tensorflow/tfjs-node` or `@tensorflow/tfjs-node-gpu` to be available as a peer dependency, depending on whether you import `upscaler/node` or `upscaler/node-gpu`.
