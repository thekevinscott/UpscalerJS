# UpscalerJS

UpscalerJS is a tool for increasing image resolution up to 4x in Javascript via a Neural Network. 

## Demo

View a live demo somewhere.

## Quick Start

```
import Upscaler from 'upscaler';
const upscaler = new Upscaler();
upscaler.upscale('/path/to/image').then(upscaledImage => {
  console.log(upscaledImage); // base64 representation of image src
});
```

## Install

Install the package with `yarn`:

```
yarn add upscaler
```

Or `npm`:

```
npm install upscaler
```

## Usage

### Instantiation

When instantiating UpscalerJS, you must provide a model, which determines the image scaling factor.

UpscalerJS provides a number of pretrained models out of the box. UpscalerJS will automatically choose one, or you can pick a pretrained one:

```
const upscaler = new Upscaler({
  model: 'div2k-300-2x',
});
```

Alternatively, you can provide a path to a pre-trained model of your own:

```
const upscaler = new Upscaler({
  model: '/path/to/model',
});
```

A full list of models is available below.

### Upscaling

You can upscale an image with the following code:

```
upscaler.upscale('/path/to/image').then(img => {
  console.log(img);
});
```

You can provide the image in any of the following formats:

* `string` - A URL to an image. Ensure the image can be loaded (for example, make sure the site's CORS policy allows for loading).
* `Image` - an HTML Image element.
* `tf.Tensor3D` - You can also pass a tensor directly.

By default, a base64-encoded `src` attribute is returned. You can change the output type like so:

```
upscaler.upscale('/path/to/image', {
  output: 'tensor',
}).then(img => {
  console.log(img);
});
```

The available types for output are:

* `src` - A src URL of the upscaled image.
* `tf.Tensor3D` - The raw tensor.

## Pretrained Models

There are a number of pretrained models provided with the package:

| Dataset | Scale | Epoch | Example |
| --- | --- |
| div2k | 2x | 100 | |
| div2k | 2x | 200 | |
| div2k | 2x | 300 | |
| div2k | 3x | 100 | |
| div2k | 3x | 200 | |
| div2k | 3x | 300 | |
| div2k | 4x | 100 | |
| div2k | 4x | 200 | |
| div2k | 4x | 300 | |
| div2k | 8x | 100 | |
| div2k | 8x | 200 | |
| div2k | 8x | 300 | |

## API

### `constructor`

Instantiates an instance of UpscalerJS.

#### Example

```
const upscaler = new Upscaler({
  model: 'div2k-300-2x',
  warmupSizes: [[256, 256]]
});
```

#### Options

* `model` (`string`) - A string of a pretrained model, or a URL to load a custom pretrained model.
* `warmupSizes` (Optional, `Array<[number, number]`>) - An array of sizes to "warm up" the model. By default, the first inference run will be slower than the rest. This passes a dummy tensor through the model to warm it up. It must match your image size exactly. Sizes are specified as `[width, height]`.

### `upscale`

Accepts an image and returns a promise resolving to the upscaled version of the image.

#### Example

```
upscaler.upscale('/path/to/image', {
  output: 'tensor',
}).then(upscaledImage => {
  ...
});
```

#### Options

* `src` (`str|HTMLImage|tf.Tensor3D`) - Path to the image, or an `HTMLImage` representation of the image, or a 3-dimensional tensor representation of the image.
* `options`
  * `output` (`src|tensor`) - The desired output of the function. Defaults to a base 64 `src` representation.

### `warmup`

If desired, the model can be "warmed up" after instantiation by calling `warmup` directly.

#### Example

```
upscaler.warmup([[256, 256]]).then(() => {
  // all done.
});
```

#### Options

* `warmupSizes` (Optional, `Array<[number, number]`>) - An array of sizes to "warm up" the model.

### `getModel`

Gets the underlying model.

#### Example

```
upscaler.getModel().then(model => {
})
```

## License

MIT
