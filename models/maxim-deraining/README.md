# MAXIM Deraining

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/maxim-deraining/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/maxim-deraining)

MAXIM Deraining is a collection of Tensorflow.js models for deraining images with UpscalerJS.

## Quick start

Install the package:

```
npm install @upscalerjs/maxim-deraining
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import small from '@upscalerjs/maxim-deraining/small';

const upscaler = new UpscalerJS({
  model: small,
})
```

## Available Models

MAXIM Deraining ships with three models of differing fidelity.

- small: `@upscalerjs/maxim-deraining/small` - quantized `uint8`, input size of 64
- medium: `@upscalerjs/maxim-deraining/medium` - quantized `uint8`, input size of 256
- large: `@upscalerjs/maxim-deraining/large` - unquantized, input size of 256

## Sample Images

### Original
![Original image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-deraining/assets/fixture.png?raw=true)

### small
![small derained image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-deraining/assets/samples/small/result.png?raw=true)

### medium
![medium derained image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-deraining/assets/samples/medium/result.png?raw=true)

### large
![large derained image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-deraining/assets/samples/large/result.png?raw=true)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/maxim-deraining](https://upscalerjs.com/models/available/maxim-deraining).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)
