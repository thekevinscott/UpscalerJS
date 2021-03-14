# UpscalerJS Models

Pre-trained models for use with [UpscalerJS](https://github.com/thekevinscott/UpscalerJS).

The models include:

| Dataset | Scale | Example |
| --- | --- | --- |
| [DIV2K](https://data.vision.ee.ethz.ch/cvl/DIV2K/) | 2x | ![2x](https://raw.githubusercontent.com/thekevinscott/UpscalerJS-models/master/examples/div2k/assets/2x.png) |
| [DIV2K](https://data.vision.ee.ethz.ch/cvl/DIV2K/) | 3x | ![3x](https://raw.githubusercontent.com/thekevinscott/UpscalerJS-models/master/examples/div2k/assets/3x.png)) |
| [DIV2K](https://data.vision.ee.ethz.ch/cvl/DIV2K/) | 4x | ![4x](https://raw.githubusercontent.com/thekevinscott/UpscalerJS-models/master/examples/div2k/assets/4x.png)) |

![Sample image](https://raw.githubusercontent.com/thekevinscott/UpscalerJS-models/master/assets/flower.png)
Sample image used for upscaling

## Contributing

You'd like to contribute a new pretrained model? Awesome!

You can get a sense of the existing pretrained models by checking out the examples folder above. Each pretrained model will have an entry (for models at different scales, they'll usually have a single README since they were trained using the same parameters and dataset).

### New models

To contribute a new pretrained model, you'll first need a model that runs in Javascript. Generally, that means that:

1. the model be trained in Tensorflow or be tensorflow-compatible 
2. the model can be converted using the [TFJS Converter](https://www.npmjs.com/package/@tensorflow/tfjs-converter) (this means avoiding things like custom layers).
3. the model be quantized, if doing so does not lead to a drastic change in accuracy. Quantization helps performance in the browser. Try for the maximum quantization you can (8-bit).

Once you've converted a model, you'll want to follow this checklist:

* Open a PR against this library. Make sure to include:
  * Your model's `model.json` and weights in a folder within the [models](https://github.com/thekevinscott/UpscalerJS-models/tree/master/models) folder.
  * An update to this README's models table including your model and its scale.
  * A `config.json` file that has a description of your model. Some helpful things to include are how you trained your model, what dataset you used, and any hyperparameters you used.
  * An entry in the [examples folder](https://github.com/thekevinscott/UpscalerJS-models/tree/master/examples/), copying the description from above and also including a sample image output for evaluation purposes.
  * Bump the version of [`package.json`](https://github.com/thekevinscott/UpscalerJS-models/blob/master/package.json). Do a minor bump (aka, `0.1.1` -> `0.1.2`)
  * Special kudos if you provide a one-click Colab or Dockerfile for reproducing your results.
* Open a PR against [UpscalerJS](https://github.com/thekevinscott/UpscalerJS)
  * Add your model to the [`MODELS` object](https://github.com/thekevinscott/UpscalerJS/blob/master/src/models.ts) so it can be loaded successfully.

## Credits

All models are trained using [`image-super-resolution`](https://github.com/idealo/image-super-resolution), an implementation of [ESRGAN](https://arxiv.org/pdf/1809.00219v2.pdf) by [@idealo](https://github.com/idealo).
