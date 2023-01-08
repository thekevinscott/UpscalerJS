# ESRGAN Medium

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/esrgan-medium/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/esrgan-medium)

ESRGAN Medium is a package of Tensorflow.js models for upscaling images with UpscalerJS.

The model's goal is to strike a balance between latency and image quality. It aims to be in the middle of speed and performance measurements between `@upscalerjs/esrgan-slim` and `@upscalerjs/esrgan-thick`.

## Quick start

Install the package:

```
npm install @upscalerjs/esrgan-medium
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import x2 from '@upscalerjs/esrgan-medium/2x';

const upscaler = new UpscalerJS({
  model: x2,
})
```

## Available Models

ESRGAN Medium ships with four models corresponding to the _scale_ of the upscaled image:

- 2x: `@upscalerjs/esrgan-medium/2x`
- 3x: `@upscalerjs/esrgan-medium/3x`
- 4x: `@upscalerjs/esrgan-medium/4x`
- 8x: `@upscalerjs/esrgan-medium/8x` (_note: the 8x model runs only in Node_)


## Sample Images

### Original
![Original image](./assets/samples/1x/flower.png)

### 2x
![2x upscaled image](./assets/samples/2x/flower.png)

### 3x
![3x upscaled image](./assets/samples/3x/flower.png)

### 4x
![4x upscaled image](./assets/samples/4x/flower.png)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/esrgan-medium](https://upscalerjs.com/models/available/esrgan-medium).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
