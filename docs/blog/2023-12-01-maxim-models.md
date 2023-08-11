---
title: MAXIM models
description: New models based on the MAXIM architecture released
slug: maxim-models
authors: kscott
tags: [announcement]
hide_table_of_contents: false
---

I've released Tensorflow.js ports of the [MAXIM family of models](https://arxiv.org/abs/2201.02973), supporting the ability to deblur, denoise, derain, dehaze, retouch, and low-light enhance images.

<!--truncate-->

## Motivation

UpscalerJS was originally created in 2020 with a primary goal of upscaling images. So far, all the models have been exclusively focused on super resolution.

Today I'm releasing a new family of MAXIM models for UpscalerJS that enable a variety of new image enhancement techniques, including:

- [Deblurring](https://upscalerjs.com/models/available/maxim-deblurring)
- [Denoising](https://upscalerjs.com/models/available/maxim-denoising)
- [Deraining](https://upscalerjs.com/models/available/maxim-deraining)
- Dehazing (both [indoor](https://upscalerjs.com/models/available/maxim-dehazing-indoor) and [outdoor](https://upscalerjs.com/models/available/maxim-dehazing-outdoor))
- [Low Light Enhancement](https://upscalerjs.com/models/available/maxim-enhancement)
- [Retouching](https://upscalerjs.com/models/available/maxim-retouching)

These models are available in Javascript via UpscalerJS, and run in both the browser and Node.js.

## MAXIM

MAXIM is the architecture at the heart of these new models.

The MAXIM paper ([MAXIM: Multi-Axis MLP for Image Processing](https://arxiv.org/abs/2201.02973)) was published in 2022, and was nominated as one of the best papers at CVPR 2022. The MAXIM architecture is capable, via training, of supporting a variety of image enhancement tasks. It's also an efficient architecture, making it particularly appealing for JavaScript applications.

> We present a multi-axis MLP based architecture called MAXIM, that can serve as an efficient and flexible general-purpose vision backbone for image processing tasks ... Our extensive experimental results show that the proposed MAXIM model achieves state-of-the-art performance on more than ten benchmarks across a range of image processing tasks, including denoising, deblurring, deraining, dehazing, and enhancement while requiring fewer or comparable numbers of parameters and FLOPs than competitive models. 

Google Research [published an implementation in Jax](https://github.com/google-research/maxim), and additional ports were made available in [Tensorflow](https://github.com/sayakpaul/maxim-tf) and [Pytorch](https://github.com/vztu/maxim-pytorch/tree/main/maxim_pytorch).

## Getting Started

You can run MAXIM models in the browser or Node.js. To get started, install your desired model:

```bash
npm install @upscalerjs/maxim-deblurring
```

And provide the model as an argument to UpscalerJS:

```javascript
import model from '@upscalerjs/maxim-deblurring'
const upscaler = new Upscaler({
  model,
})
```

For model-specific instructions, [check out the specific model page](/models) you're interested in.

## Samples

Below are some samples of each image enhancement task:

### Deblurring

*Before*

![Deblurring Before](/assets/sample-images/maxim-deblurring/fixture.png)

*After*

![Deblurring After](/assets/sample-images/maxim-deblurring/result.png)

### Denoising

*Before*

![Denoising Before](/assets/sample-images/maxim-denoising/fixture.png)

*After*

![Denoising After](/assets/sample-images/maxim-denoising/result.png)

### Deraining

*Before*

![Deraining Before](/assets/sample-images/maxim-deraining/fixture.png)

*After*

![Deraining After](/assets/sample-images/maxim-deraining/result.png)

### Low Light Enhancement

*Before*

![Low Light Enhancement Before](/assets/sample-images/maxim-enhancement/fixture.png)

*After*

![Low Light Enhancement After](/assets/sample-images/maxim-enhancement/result.png)

### Retouching

*Before*

![Retouching Before](/assets/sample-images/maxim-retouching/fixture.png)

*After*

![Retouching After](/assets/sample-images/maxim-retouching/result.png)

### Dehazing Indoor

*Before*

![Dehazing Indoor Before](/assets/sample-images/maxim-dehazing-indoor/fixture.png)

*After*

![Dehazing Indoor After](/assets/sample-images/maxim-dehazing-indoor/result.png)

### Dehazing Outdoor

*Before*

![Dehazing Outdoor Before](/assets/sample-images/maxim-dehazing-outdoor/fixture.png)

*After*

![Dehazing Outdoor After](/assets/sample-images/maxim-dehazing-outdoor/result.png)

## Technical Information

My original attempts at getting this working leveraged both the [Jax repo](https://github.com/google-research/maxim/) as well as the [Tensorflow port](https://github.com/sayakpaul/maxim-tf/tree/main). The ported Jax model exhibited close-to-identical fidelity with its Python implementation, but the Tensorflow port was far more performant in the browser, albiet with noticeably inferior fidelity.

Both implementations originally required fixed size inputs in order to port to Tensorflow.js. Fixed size inputs require chunking images, which can break models that rely on a holisitic view of the image, specifically the Dehazing models, Enhancement model, and Retouching model. (For samples of the artifacting this produces and a longer discussion, [see this Github issue](https://github.com/thekevinscott/UpscalerJS/issues/913).)

I modified the MAXIM Jax code to support dynamic image input sizes, [and opened a PR here](https://github.com/google-research/maxim/pull/41). [This PR is also integrated in my fork of the MAXIM code](https://github.com/thekevinscott/maxim).

(There is also an [open PR against the Tensorflow repo exploring dynamic sizes](https://github.com/sayakpaul/maxim-tf/pull/24); when it gets merged, I'll explore porting it to Tensorflow.js as well.) 

If you'd like to check out the Tensorflow implementation port (noticeably faster, noticeably worse inference, and a fixed size input) these models are available under the `maxim-experiments` repo in the UpscalerJS repo. Clone the repo, pull the models (`dvc pull`) and you'll see fixed-input models of `64` and `256` pixel sizes respectively for each task.

## Converting the files yourself

If you'd like to convert the original Jax or Tensorflow model files yourself, instructions are [in these Jupyter notebooks](https://github.com/upscalerjs/maxim). Feel free to open an issue on Github if you run into issues or questions.

----

The past few years have seen an explosion of innovation in the image enhancement space, and I hope to continue bringing the latest innovations to Javascript. MAXIM is a first step towards enabling Javascript-based image enhancement tasks beyond super resolution in UpscalerJS.

If you have particular models you'd like to see available via UpscalerJS, [let me know in Github](https://github.com/thekevinscott/UpscalerJS/discussions/new?category=ideas). If you use MAXIM in your work, [I'd love to hear about it](https://github.com/thekevinscott/UpscalerJS/discussions/new?category=show-and-tell)! And if you run into questions or find bugs, [please open a bug report](https://github.com/thekevinscott/UpscalerJS/issues/new?assignees=thekevinscott&labels=&projects=&template=bug_report.md&title=).
