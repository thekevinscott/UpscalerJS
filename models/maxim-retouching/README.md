# MAXIM Retouching

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/maxim-retouching/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/maxim-retouching)

MAXIM Retouching is a collection of Tensorflow.js models for retouching images with UpscalerJS.

## Quick start

Install the package:

```
npm install @upscalerjs/maxim-retouching
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import small from '@upscalerjs/maxim-retouching/small';

const upscaler = new UpscalerJS({
  model: small,
})
```

## Available Models

MAXIM Retouching ships with three models of differing fidelity.

- small: `@upscalerjs/maxim-retouching/small` - quantized `uint8`, input size of 64
- medium: `@upscalerjs/maxim-retouching/medium` - quantized `uint8`, input size of 256
- large: `@upscalerjs/maxim-retouching/large` - unquantized, input size of 256

## Sample Images

### Original
![Original image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-retouching/assets/fixture.png?raw=true)

### small
![small retouched image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-retouching/assets/samples/small/result.png?raw=true)

### medium
![medium retouched image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-retouching/assets/samples/medium/result.png?raw=true)

### large
![large retouched image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-retouching/assets/samples/large/result.png?raw=true)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/maxim-retouching](https://upscalerjs.com/models/available/maxim-retouching).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
