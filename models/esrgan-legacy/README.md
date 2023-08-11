# ESRGAN Legacy

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/esrgan-legacy/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/esrgan-legacy)

ESRGAN Legacy is a package of models for upscaling images with [UpscalerJS](https://upscalerjs.com).

This package contains the five models available in pre-`1.0.0` versions of UpscalerJS.

## Quick start

Install the package:

```
npm install @upscalerjs/esrgan-legacy
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import gans from '@upscalerjs/esrgan-legacy/gans';

const upscaler = new UpscalerJS({
  model: gans,
})
```

## Paper

> The Super-Resolution Generative Adversarial Network (SRGAN) is a seminal work that is capable of generating realistic textures during single image super-resolution. However, the hallucinated details are often accompanied with unpleasant artifacts. To further enhance the visual quality, we thoroughly study three key components of SRGAN - network architecture, adversarial loss and perceptual loss, and improve each of them to derive an Enhanced SRGAN (ESRGAN). In particular, we introduce the Residual-in-Residual Dense Block (RRDB) without batch normalization as the basic network building unit. Moreover, we borrow the idea from relativistic GAN to let the discriminator predict relative realness instead of the absolute value. Finally, we improve the perceptual loss by using the features before activation, which could provide stronger supervision for brightness consistency and texture recovery. Benefiting from these improvements, the proposed ESRGAN achieves consistently better visual quality with more realistic and natural textures than SRGAN and won the first place in the PIRM2018-SR Challenge.

&mdash; [ESRGAN: Enhanced Super-Resolution Generative Adversarial Networks](https://arxiv.org/abs/1809.00219)

## Available Models

ESRGAN Legacy ships with five models:

- `gans`: `@upscalerjs/esrgan-legacy/gans`
- `psnr-small`: `@upscalerjs/esrgan-legacy/psnr-small`
- `div2k/2x`: `@upscalerjs/esrgan-legacy/div2k/2x`
- `div2k/3x`: `@upscalerjs/esrgan-legacy/div2k/3x`
- `div2k/4x`: `@upscalerjs/esrgan-legacy/div2k/4x`

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/upscaling/esrgan-legacy](https://upscalerjs.com/models/available/upscaling/esrgan-legacy).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
