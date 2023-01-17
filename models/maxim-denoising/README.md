# MAXIM Denoising

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/maxim-denoising/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/maxim-denoising)

MAXIM Denoising is a collection of Tensorflow.js models for denoising images with UpscalerJS.

## Quick start

Install the package:

```
npm install @upscalerjs/maxim-denoising
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import small from '@upscalerjs/maxim-denoising/small';

const upscaler = new UpscalerJS({
  model: small,
})
```

## Available Models

MAXIM Denoising ships with three models of differing fidelity.

- small: `@upscalerjs/maxim-denoising/small` - quantized `uint8`, input size of 64
- medium: `@upscalerjs/maxim-denoising/medium` - quantized `uint8`, input size of 256
- large: `@upscalerjs/maxim-denoising/large` - unquantized, input size of 256

## Sample Images

### Original
![Original image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-denoising/assets/fixture.png?raw=true)

### small
![small denoised image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-denoising/assets/samples/small/result.png?raw=true)

### medium
![medium denoised image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-denoising/assets/samples/medium/result.png?raw=true)

### large
![large denoised image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-denoising/assets/samples/large/result.png?raw=true)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/maxim-denoising](https://upscalerjs.com/models/available/maxim-denoising).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
