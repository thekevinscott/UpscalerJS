"""
Convert a UpscalerJS tfjs layers model → ONNX.

Tested on `models/esrgan-medium/x4` (standard Conv2D + Activation, no
custom layers). Models that use custom layers (e.g. `esrgan-thick`'s
MultiplyBeta / PixelShuffle4x) need their custom layer classes re-authored
in Python before this script can load them — that's the "custom ops"
caveat in the spike README.

Usage:
  python convert-tfjs-to-onnx.py <path/to/model.json> <out.onnx>

Environment (see README for full setup notes):
  pip install 'protobuf>=6.31,<7'
  pip install tensorflow==2.13.1 tensorflowjs==4.10.0 tf2onnx==1.14.0 onnx onnxruntime
  # tensorflowjs 4.10 imports jax.experimental.jax2tf.shape_poly at load
  # time; newer jax doesn't expose it. Patch jax_conversion.py to tolerate
  # the missing symbol with try/except, or pin jax appropriately.
"""
import os, sys

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import tensorflow as tf
import tensorflowjs as tfjs
import tf2onnx


def convert(model_json: str, out_onnx: str, opset: int = 17) -> None:
    os.makedirs(os.path.dirname(out_onnx) or '.', exist_ok=True)
    print(f'Loading tfjs layers model: {model_json}', flush=True)
    model = tfjs.converters.load_keras_model(model_json)
    print(f'  input:  {model.input_shape}', flush=True)
    print(f'  output: {model.output_shape}', flush=True)
    print(f'  params: {model.count_params():,}', flush=True)

    # Fully-conv: keep H/W dynamic so the same ONNX file handles any tile size.
    spec = (tf.TensorSpec((None, None, None, 3), tf.float32, name='input'),)
    print(f'Converting → ONNX (opset {opset})...', flush=True)
    tf2onnx.convert.from_keras(model, input_signature=spec, opset=opset,
                               output_path=out_onnx)
    print(f'Wrote {out_onnx} ({os.path.getsize(out_onnx):,} bytes)', flush=True)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    convert(sys.argv[1], sys.argv[2])
