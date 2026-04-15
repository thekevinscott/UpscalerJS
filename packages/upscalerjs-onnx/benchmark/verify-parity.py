"""
Sanity-check: run the same input through the Keras model and the converted
ONNX model and confirm outputs match to float precision.

Usage:
  python verify-parity.py <model.json> <model.onnx> <image.png>
"""
import os, sys
import numpy as np

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import tensorflowjs as tfjs
import onnxruntime as ort
from PIL import Image


def main(model_json: str, onnx_path: str, img_path: str) -> None:
    img = np.array(Image.open(img_path).convert('RGB'), dtype=np.float32) / 255.0
    # Crop so we always run on a predictable size.
    img = img[:64, :64, :]
    x = img[np.newaxis]  # (1, H, W, 3)
    print(f'input: {x.shape}', flush=True)

    model = tfjs.converters.load_keras_model(model_json)
    y_tf = model.predict(x, verbose=0)
    print(f'tf  out: {y_tf.shape}  range [{y_tf.min():.4f}, {y_tf.max():.4f}]')

    sess = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
    y_on = sess.run(None, {sess.get_inputs()[0].name: x})[0]
    print(f'onnx out: {y_on.shape}  range [{y_on.min():.4f}, {y_on.max():.4f}]')

    diff = np.abs(y_tf - y_on)
    print(f'|tf - onnx|: max={diff.max():.2e}  mean={diff.mean():.2e}')
    assert diff.max() < 1e-3, f'parity check failed (max diff {diff.max()})'
    print('OK')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(2)
    main(*sys.argv[1:])
