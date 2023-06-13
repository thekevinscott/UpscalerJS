# ESRGAN Legacy

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/esrgan-legacy/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/esrgan-legacy)

ESRGAN Legacy is a package of Tensorflow.js models for upscaling images with UpscalerJS.

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

## Available Models

ESRGAN Legacy ships with five models:

- `gans`: `@upscalerjs/esrgan-legacy/gans`
- `psnr-small`: `@upscalerjs/esrgan-legacy/psnr-small`
- `div2k/2x`: `@upscalerjs/esrgan-legacy/div2k/2x`
- `div2k/3x`: `@upscalerjs/esrgan-legacy/div2k/3x`
- `div2k/4x`: `@upscalerjs/esrgan-legacy/div2k/4x`

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/esrgan-legacy](https://upscalerjs.com/models/available/esrgan-legacy).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
