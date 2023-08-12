---
title: Introduction
description: Introduction
sidebar_position: 1
hide_title: true
---

<a class="docs-link" href="https://upscalerjs.com/documentation">View this page on the UpscalerJS website</a>

# Introduction

UpscalerJS is a tool for enhancing images in Javascript using AI. It can run in the browser, Node.js, and in Worker environments. It's open source, free to use, and ships with models to use out of the box so users don't have to install anything.

UpscalerJS supports a variety of image enhancement techniques, but its original purpose was to support super resolution. We'll go through a quick crash course on super resolution below.

## Motivation for Super Resolution

There's a number of ways to increase an image's size. One way is to simply double the size of each pixel, which results in a pixelated image:

![Pixelated 2x](./assets/image-2x.png)

Most browsers by default use an algorithm called bicubic interpolation to get a more pleasing version, but this loses image quality and increases blurriness:

![Bicubic 2x](./assets/image-bicubic-2x.png)

Neural Networks can allow us to "paint in" the expanded sections of the image, enhancing quality.

![Upscaled 2x](./assets/image-upscaled-2x.png)

## Motivation for Javascript

UpscalerJS is written in Javascript and is built on top of Tensorflow.js.

Javascript for machine learning offers several benefits:

- **Convenience**: By running the code on users' devices, there's no need for installations or server-side implementation. This means inference happens immediately, without any extra setup.
- **Privacy**: Since images don't need to leave the users' device for processing, UpscalerJS offers a secure and private solution for machine learning.
- **Performance**: In addition to being convenient, running UpscalerJS clientside can also offer a latency benefit. By avoiding the need for a round trip to the server for processing, UpscalerJS can deliver faster results to users.
- **Compatibility**: UpscalerJS can be used on a variety of platforms, including Node.js, Electron, and Cloudflare Workers, making it a versatile choice for upscaling needs.
- **Simplicity**: If a codebase is already written in Javascript, UpscalerJS can be easily integrated into existing workflows. This makes it an ideal choice for bringing the power of machine learning to users without any additional complications.

## Next Steps

With UpscalerJS, leverage the benefits of Javascript to deliver fast, convenient, and secure upscaling and image enhancement with AI.

[Learn more about how to install UpscalerJS and get started](/documentation/getting-started).
