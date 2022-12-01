# ESRGAN Thick

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/esrgan-thick/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/esrgan-thick)

ESRGAN Thick is a package of Tensorflow.js models for upscaling images with UpscalerJS.

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

## Available Models

ESRGAN thick ships with four models corresponding to the _scale_ of the upscaled image:

- 2x: `@upscalerjs/esrgan-thick/2x`
- 3x: `@upscalerjs/esrgan-thick/3x`
- 4x: `@upscalerjs/esrgan-thick/4x`
- 8x: `@upscalerjs/esrgan-thick/8x`

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/esrgan-thick](https://upscalerjs.com/models/available/esrgan-thick).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
