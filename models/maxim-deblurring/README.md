# MAXIM Deblurring

[![](https://data.jsdelivr.com/v1/package/npm/@upscalerjs/maxim-deblurring/badge)](https://www.jsdelivr.com/package/npm/@upscalerjs/maxim-deblurring)

MAXIM Deblurring is a collection of Tensorflow.js models for deblurring images with UpscalerJS.

## Quick start

Install the package:

```
npm install @upscalerjs/maxim-deblurring
```

Then, import a specific model and pass it as an argument to an instance of UpscalerJS:

```
import UpscalerJS from 'upscaler';
import small from '@upscalerjs/maxim-deblurring/small';

const upscaler = new UpscalerJS({
  model: small,
})
```

## Available Models

MAXIM Deblurring ships with three models of differing fidelity.

- small: `@upscalerjs/maxim-deblurring/small` - quantized `uint8`, input size of 64
- medium: `@upscalerjs/maxim-deblurring/medium` - quantized `float16`, input size of 256
- large: `@upscalerjs/maxim-deblurring/large` - unquantized, input size of 256

## Sample Images

### Original
![Original image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-deblurring/assets/fixture.png?raw=true)

### small
![small deblurred image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-deblurring/assets/samples/small/result.png?raw=true)

### medium
![medium deblurred image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-deblurring/assets/samples/medium/result.png?raw=true)

### large
![large deblurred image](https://github.com/thekevinscott/UpscalerJS/blob/main/models/maxim-deblurring/assets/samples/large/result.png?raw=true)

## Documentation

For more documentation, check out the model documentation at [upscalerjs.com/models/available/maxim-deblurring](https://upscalerjs.com/models/available/maxim-deblurring).

## License

[MIT License](https://oss.ninja/mit/developit/) © [Kevin Scott](https://thekevinscott.com)

