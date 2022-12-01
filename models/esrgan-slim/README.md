# ESRGAN Slim

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/esrgan-slim/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/esrgan-slim)

ESRGAN Slim is a package of Tensorflow.js models for upscaling images with UpscalerJS.

The model's goal is to minimize latency without compromising quality.

## Quick start

Install the package:

```
npm install @upscalerjs/esrgan-slim
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import x2 from '@upscalerjs/esrgan-slim/2x';

const upscaler = new UpscalerJS({
  model: x2,
})
```

## Available Models

ESRGAN Slim ships with four models corresponding to the _scale_ of the upscaled image:

- 2x: `@upscalerjs/esrgan-slim/2x`
- 3x: `@upscalerjs/esrgan-slim/3x`
- 4x: `@upscalerjs/esrgan-slim/4x`
- 8x: `@upscalerjs/esrgan-slim/8x` (_note: the 8x model runs only in Node_)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/esrgan-slim](https://upscalerjs.com/models/available/esrgan-slim).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
