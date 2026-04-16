#!/usr/bin/env bash
# Stage everything the bench page needs into ./public/.
# Idempotent — safe to re-run.
set -euo pipefail

cd "$(dirname "$0")"

# Repo root is 4 levels up: browser → benchmark → upscalerjs-onnx → packages → root
REPO_ROOT="$(cd ../../../.. && pwd)"
TFJS_MODEL_SRC="$REPO_ROOT/models/esrgan-medium/models/x4"
ONNX_MODEL_SRC="$REPO_ROOT/packages/upscalerjs-onnx/benchmark/models/onnx/model.onnx"
INPUT_SRC="$REPO_ROOT/assets/flower.png"

mkdir -p public/models/tfjs public/models/onnx public/vendor/tfjs public/vendor/ort

echo "→ tfjs model from $TFJS_MODEL_SRC"
if [[ ! -f "$TFJS_MODEL_SRC/model.json" ]]; then
  echo "  ERR: $TFJS_MODEL_SRC/model.json not found"; exit 1
fi
cp "$TFJS_MODEL_SRC"/* public/models/tfjs/

echo "→ onnx model from $ONNX_MODEL_SRC"
if [[ ! -f "$ONNX_MODEL_SRC" ]]; then
  echo "  ERR: $ONNX_MODEL_SRC not found."
  echo "  Generate it first via the Node bench setup:"
  echo "    cd ../  # packages/upscalerjs-onnx/benchmark"
  echo "    python convert-tfjs-to-onnx.py \\"
  echo "      ../../../models/esrgan-medium/models/x4/model.json \\"
  echo "      ./models/onnx/model.onnx"
  exit 1
fi
cp "$ONNX_MODEL_SRC" public/models/onnx/model.onnx

echo "→ input image"
cp "$INPUT_SRC" public/input.png

echo "→ tfjs vendor JS + WASM"
cp node_modules/@tensorflow/tfjs/dist/tf.min.js                            public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.min.js  public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm                  public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-webgpu/dist/tf-backend-webgpu.min.js public/vendor/tfjs/

echo "→ onnxruntime-web vendor JS + WASM"
# ort.all.min.js bundles every EP (wasm/webgl/webgpu/webnn). The "ort.min.js"
# variant is wasm-only.
cp node_modules/onnxruntime-web/dist/ort.all.min.js public/vendor/ort/
# .mjs threaded loaders + .wasm binaries for every EP
cp node_modules/onnxruntime-web/dist/*.mjs  public/vendor/ort/ 2>/dev/null || true
cp node_modules/onnxruntime-web/dist/*.wasm public/vendor/ort/

echo
echo "✓ public/ ready. Run:  npm run bench"
