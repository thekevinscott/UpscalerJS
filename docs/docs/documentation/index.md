---
title: Introduction
description: Introduction
sidebar_position: 1
---

<a class="docs-link" href="https://upscalerjs.com/documentation">View this page on the UpscalerJS website</a>

# Introduction

UpscalerJS is a tool for increasing image resolution in Javascript via a Neural Network up to 4x. It's open source, free to use, and ships with models to use out of the box. Your users won't have to install a thing.

## Motivation

Increasing an image's size results in a pixelated image:

![Pixelated 2x](./assets/image-2x.png)

Most browsers by default use an algorithm called bicubic interpolation to get a more pleasing version, but this loses image quality and increases blurriness:

![Bicubic 2x](./assets/image-bicubic-2x.png)

Neural Networks [can allow us to "paint in" the expanded sections of the image](https://paperswithcode.com/task/image-super-resolution), enhancing quality.

![Upscaled 2x](./assets/image-upscaled-2x.png)

## Javascript

UpscalerJS is written in Javascript (on top of Tensorflow.js).

Most Super Resolution (most machine learning, for that matter) is done via Python. Javascript for machine learning has several benefits:

### Convenience
By running the code on your users' devices, there's no need for installations or server-side implementation. This means your users can get started with upscaling inference immediately, without any extra setup.

### Privacy
Since images don't need to leave the users' device for processing, UpscalerJS offers a secure and private solution for machine learning.

### Performance
In addition to being convenient, running UpscalerJS clientside can also offer a latency benefit. By avoiding the need for a round trip to the server for processing, UpscalerJS can deliver faster results to your users.

### Compatibility
UpscalerJS can be used on a variety of platforms, including Node.js, Electron, and Cloudflare Workers, making it a versatile choice for your upscaling needs.

### Simplicity
If your codebase is already written in Javascript, UpscalerJS can be easily integrated into your existing workflow. This makes it an ideal choice for bringing the power of machine learning to your users without any additional complications.

## Next Steps

With UpscalerJS, you can leverage the benefits of Javascript to deliver fast, convenient, and secure upscaling for your users.

[Learn more about how to install UpscalerJS and get started](/documentation/getting-started).
