---
title: Introduction
description: Introduction
sidebar_position: 1
---

# Introduction

UpscalerJS is a tool for increasing image resolution in Javascript via a Neural Network up to 4x.

![Demo](assets/demo.gif)

[A live demo is here](/demo).

**Features**

* 📷 Scale images at 2x, 3x, and 4x resolutions.
* 🤖 Choose from a variety of pre-trained models, or provide your own
* 🚀 Browser & Node Support
* 🖼️ Images first class citizens
* 📦 ESM, CJS, and UMD available.
* 📋 Extensive documentation

## Motivation

### Why?

Increasing an image's size results in a pixelated image:

![Pixelated 2x](./assets/image-2x.png)

Most browsers by default use an algorithm called bicubic interpolation to get a more pleasing version, but this loses image quality and increases blurriness:

![Bicubic 2x](./assets/image-bicubic-2x.png)

Neural Networks [can allow us to "paint in" the expanded sections of the image](https://paperswithcode.com/task/image-super-resolution), enhancing quality.

![Upscaled 2x](./assets/image-upscaled-2x.png)

### Benefits of the Browser

Why do this in the browser?

Most cutting edge Neural Networks demand heavy computation and big GPUs, but UpscalerJS leverages Tensorflow.js to run directly in your browser. Users' data can stay on their machines, and you don't need to set up a server.
