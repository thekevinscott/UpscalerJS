# DIV2K Model

The DIV2K model is trained on the [DIV2K dataset](https://data.vision.ee.ethz.ch/cvl/DIV2K/).

Each model is trained using an RDN from [image-super-resolution](https://github.com/idealo/image-super-resolution). The hyperparameters for each are {C: 3, D: 10, G: 64, G0: 64 }.

Each model is quantized to 8-bit.

There are three scales:

## 2x

![2x](https://raw.githubusercontent.com/thekevinscott/UpscalerJS-models/master/examples/div2k/assets/2x.png)

## 3x

![3x](https://raw.githubusercontent.com/thekevinscott/UpscalerJS-models/master/examples/div2k/assets/3x.png)

## 4x

![4x](https://raw.githubusercontent.com/thekevinscott/UpscalerJS-models/master/examples/div2k/assets/4x.png)
