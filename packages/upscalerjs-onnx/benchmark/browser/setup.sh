#!/usr/bin/env bash
# Stage everything the bench page needs into ./public/.
# Idempotent — safe to re-run. No runtime Python needed.
set -euo pipefail

cd "$(dirname "$0")"

# Repo root is 4 levels up: browser → benchmark → upscalerjs-onnx → packages → root
REPO_ROOT="$(cd ../../../.. && pwd)"
TFJS_MODEL_SRC="$REPO_ROOT/models/esrgan-medium/models/x4"
# ONNX is pre-patched (Concat surgery already applied — see ../split-concat.py)
# and committed, so no Python toolchain is required to run the bench.
ONNX_MODEL_SRC="$REPO_ROOT/packages/upscalerjs-onnx/benchmark/models/onnx/model.onnx"
INPUT_SRC="$REPO_ROOT/assets/flower.png"

mkdir -p public/models/tfjs public/models/onnx public/vendor/tfjs public/vendor/ort

echo "→ tfjs model"
[[ -f "$TFJS_MODEL_SRC/model.json" ]] || { echo "ERR: $TFJS_MODEL_SRC/model.json not found"; exit 1; }
cp "$TFJS_MODEL_SRC"/* public/models/tfjs/

echo "→ onnx model (pre-patched: wide Concat split for WebGPU 8-buffer limit)"
[[ -f "$ONNX_MODEL_SRC" ]] || { echo "ERR: $ONNX_MODEL_SRC not found"; exit 1; }
cp "$ONNX_MODEL_SRC" public/models/onnx/model.onnx

echo "→ input image"
cp "$INPUT_SRC" public/input.png

echo "→ tfjs vendor JS + WASM"
cp node_modules/@tensorflow/tfjs/dist/tf.min.js                              public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.min.js    public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm                    public/vendor/tfjs/
cp node_modules/@tensorflow/tfjs-backend-webgpu/dist/tf-backend-webgpu.min.js public/vendor/tfjs/

echo "→ onnxruntime-web vendor JS + WASM"
# ort.all.min.js bundles every EP (wasm/webgl/webgpu/webnn). The plain
# "ort.min.js" variant is wasm-only.
cp node_modules/onnxruntime-web/dist/ort.all.min.js public/vendor/ort/
cp node_modules/onnxruntime-web/dist/*.mjs          public/vendor/ort/ 2>/dev/null || true
cp node_modules/onnxruntime-web/dist/*.wasm         public/vendor/ort/

echo "✓ public/ staged"
