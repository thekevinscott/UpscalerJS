# MAXIM Dehazing Indoor

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/maxim-dehazing-indoor/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/maxim-dehazing-indoor)

MAXIM Dehazing Indoor is a collection of Tensorflow.js models for dehazing-indoor images with UpscalerJS.

## Quick start

Install the package:

```
npm install @upscalerjs/maxim-dehazing-indoor
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import small from '@upscalerjs/maxim-dehazing-indoor/small';

const upscaler = new UpscalerJS({
  model: small,
})
```

## Available Models

MAXIM Dehazing Indoor ships with three models of differing fidelity.

- small: `@upscalerjs/maxim-dehazing-indoor/small` - quantized `uint8`, input size of 64
- medium: `@upscalerjs/maxim-dehazing-indoor/medium` - quantized `uint16`, input size of 256
- large: `@upscalerjs/maxim-dehazing-indoor/large` - unquantized, input size of 256

## Sample Images

### Original
![Original image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-dehazing-indoor/assets/fixture.png?raw=true)

### small
![small dehazed image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-dehazing-indoor/assets/samples/small/result.png?raw=true)

### medium
![medium dehazed image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-dehazing-indoor/assets/samples/medium/result.png?raw=true)

### large
![large dehazed image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-dehazing-indoor/assets/samples/large/result.png?raw=true)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/maxim-dehazing-indoor](https://upscalerjs.com/models/available/maxim-dehazing-indoor).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)


