# MAXIM Experiments

The models in this repo are exports from the [Tensorflow port of the MAXIM family of models](https://github.com/sayakpaul/maxim-tf/tree/main).

They run considerably faster than the Jax port, but exhibit artifacting and inferior performance. They also only operate on fixed size chunks of image, which for certain models introduces severe artifacting.

[See this issue for more on the artifacting issues](https://github.com/thekevinscott/UpscalerJS/issues/913), and see [this notebook](https://github.com/upscalerjs/maxim/blob/main/Runbook%20-%20TF%20Models.ipynb) for information on how to convert from Tensorflow to Tensorflow.js.
