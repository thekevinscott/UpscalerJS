# ESRGAN Thick

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/esrgan-thick/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/esrgan-thick)

ESRGAN Thick is a package of models for upscaling images with [UpscalerJS](https://upscalerjs.com).

The model's goal is to maximize performance.

## Quick start

Install the package:

```
npm install @upscalerjs/esrgan-thick
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import x2 from '@upscalerjs/esrgan-thick/2x';

const upscaler = new UpscalerJS({
  model: x2,
})
```

## Paper

> The Super-Resolution Generative Adversarial Network (SRGAN) is a seminal work that is capable of generating realistic textures during single image super-resolution. However, the hallucinated details are often accompanied with unpleasant artifacts. To further enhance the visual quality, we thoroughly study three key components of SRGAN - network architecture, adversarial loss and perceptual loss, and improve each of them to derive an Enhanced SRGAN (ESRGAN). In particular, we introduce the Residual-in-Residual Dense Block (RRDB) without batch normalization as the basic network building unit. Moreover, we borrow the idea from relativistic GAN to let the discriminator predict relative realness instead of the absolute value. Finally, we improve the perceptual loss by using the features before activation, which could provide stronger supervision for brightness consistency and texture recovery. Benefiting from these improvements, the proposed ESRGAN achieves consistently better visual quality with more realistic and natural textures than SRGAN and won the first place in the PIRM2018-SR Challenge.

&mdash; [ESRGAN: Enhanced Super-Resolution Generative Adversarial Networks](https://arxiv.org/abs/1809.00219)

## Available Models

ESRGAN thick ships with four models corresponding to the _scale_ of the upscaled image:

- 2x: `@upscalerjs/esrgan-thick/2x`
- 3x: `@upscalerjs/esrgan-thick/3x`
- 4x: `@upscalerjs/esrgan-thick/4x`
- 8x: `@upscalerjs/esrgan-thick/8x`

## Sample Images

### Original
![Original image](https://github.com/thekevinscott/UpscalerJS/blob/main/assets/flower.png?raw=true)

### 2x
![2x upscaled image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/esrgan-thick/assets/samples/2x/flower.png?raw=true)

### 3x
![3x upscaled image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/esrgan-thick/assets/samples/3x/flower.png?raw=true)

### 4x
![4x upscaled image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/esrgan-thick/assets/samples/4x/flower.png?raw=true)

### 8x
![8x upscaled image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/esrgan-thick/assets/samples/8x/flower.png?raw=true)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/upscaling/esrgan-thick](https://upscalerjs.com/models/available/upscaling/esrgan-thick).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
