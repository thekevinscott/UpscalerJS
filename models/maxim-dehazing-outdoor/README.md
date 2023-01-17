# MAXIM Dehazing outdoor

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/maxim-dehazing-outdoor/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/maxim-dehazing-outdoor)

MAXIM Dehazing outdoor is a collection of Tensorflow.js models for dehazing-outdoor images with UpscalerJS.

## Quick start

Install the package:

```
npm install @upscalerjs/maxim-dehazing-outdoor
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import small from '@upscalerjs/maxim-dehazing-outdoor/small';

const upscaler = new UpscalerJS({
  model: small,
})
```

## Available Models

MAXIM Dehazing outdoor ships with three models of differing fidelity.

- small: `@upscalerjs/maxim-dehazing-outdoor/small` - quantized `uint8`, input size of 64
- medium: `@upscalerjs/maxim-dehazing-outdoor/medium` - quantized `uint16`, input size of 256
- large: `@upscalerjs/maxim-dehazing-outdoor/large` - unquantized, input size of 256

## Sample Images

### Original
![Original image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-dehazing-outdoor/assets/fixture.png?raw=true)

### small
![small dehazed image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-dehazing-outdoor/assets/samples/small/result.png?raw=true)

### medium
![medium dehazed image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-dehazing-outdoor/assets/samples/medium/result.png?raw=true)

### large
![large dehazed image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-dehazing-outdoor/assets/samples/large/result.png?raw=true)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/maxim-dehazing-outdoor](https://upscalerjs.com/models/available/maxim-dehazing-outdoor).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)



