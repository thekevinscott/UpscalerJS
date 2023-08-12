# Default Model

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/default-model/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/default-model)

This model is the default upscaling model used with [UpscalerJS](https://upscalerjs.com). It is a copy of the 2x model made available via [@upscalerjs/esrgan-slim](https://upscalerjs.com/models/available/upscaling/esrgan-slim).

## Quick start

`@upscalerjs/default-model` comes pre-installed with `upscaler`. It is the default model when no `model` is provided:

```
import UpscalerJS from 'upscaler';
const upscaler = new UpscalerJS(); // Using the default-model
```

## Paper

> The Super-Resolution Generative Adversarial Network (SRGAN) is a seminal work that is capable of generating realistic textures during single image super-resolution. However, the hallucinated details are often accompanied with unpleasant artifacts. To further enhance the visual quality, we thoroughly study three key components of SRGAN - network architecture, adversarial loss and perceptual loss, and improve each of them to derive an Enhanced SRGAN (ESRGAN). In particular, we introduce the Residual-in-Residual Dense Block (RRDB) without batch normalization as the basic network building unit. Moreover, we borrow the idea from relativistic GAN to let the discriminator predict relative realness instead of the absolute value. Finally, we improve the perceptual loss by using the features before activation, which could provide stronger supervision for brightness consistency and texture recovery. Benefiting from these improvements, the proposed ESRGAN achieves consistently better visual quality with more realistic and natural textures than SRGAN and won the first place in the PIRM2018-SR Challenge.

&mdash; [ESRGAN: Enhanced Super-Resolution Generative Adversarial Networks](https://arxiv.org/abs/1809.00219)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/upscaling/default-model](https://upscalerjs.com/models/available/upscaling/default-model).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
