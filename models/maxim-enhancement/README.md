# MAXIM Enhancement

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/maxim-enhancement/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/maxim-enhancement)

MAXIM Enhancement is a collection of Tensorflow.js models for enhancement images with UpscalerJS.

## Quick start

Install the package:

```
npm install @upscalerjs/maxim-enhancement
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import small from '@upscalerjs/maxim-enhancement/small';

const upscaler = new UpscalerJS({
  model: small,
})
```

## Available Models

MAXIM Enhancement ships with three models of differing fidelity.

- small: `@upscalerjs/maxim-enhancement/small` - quantized `uint8`, input size of 64
- medium: `@upscalerjs/maxim-enhancement/medium` - quantized `uint8`, input size of 256
- large: `@upscalerjs/maxim-enhancement/large` - unquantized, input size of 256

## Sample Images

### Original
![Original image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-enhancement/assets/fixture.png?raw=true)

### small
![small enhanced image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-enhancement/assets/samples/small/result.png?raw=true)

### medium
![medium enhanced image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-enhancement/assets/samples/medium/result.png?raw=true)

### large
![large enhanced image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-enhancement/assets/samples/large/result.png?raw=true)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/maxim-enhancement](https://upscalerjs.com/models/available/maxim-enhancement).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)

