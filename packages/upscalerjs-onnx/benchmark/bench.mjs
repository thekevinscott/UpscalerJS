/**
 * End-to-end benchmark: esrgan-medium x4 through tfjs-node (CPU) vs
 * onnxruntime-node (CPU). Same image, same weights (converted from the
 * same Keras source), same NHWC layout, same [0,1] normalisation.
 *
 * This is a direct model.predict / session.run comparison — not the
 * full UpscalerJS patch/tile pipeline. Patching is orthogonal and would
 * add identical overhead to both backends.
 */
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import url from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const INPUT = path.join(__dirname, 'input.png');
const TFJS_MODEL_URL = 'file://' + path.join(__dirname, 'models/tfjs/model.json');
const ONNX_PATH = path.join(__dirname, 'models/onnx/model.onnx');

const SIZES = [32, 64, 128];   // input HxW; output is 4× each
const WARMUP = 3;
const ITERS = 10;

function fmt(ms) { return ms.toFixed(1).padStart(6) + ' ms'; }
function stats(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  return { mean, median, min: sorted[0], max: sorted[sorted.length - 1] };
}

async function loadImageHWC(size) {
  // Resize cover so every run uses `size × size × 3`
  const { data, info } = await sharp(INPUT)
    .removeAlpha()
    .resize(size, size, { fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const f = new Float32Array(info.width * info.height * 3);
  for (let i = 0; i < f.length; i++) f[i] = data[i] / 255;
  return { data: f, width: info.width, height: info.height };
}

async function loadTFJS() {
  const t0 = performance.now();
  const tfjs = await import('@tensorflow/tfjs-node');
  const tInit = performance.now();
  const model = await tfjs.loadLayersModel(TFJS_MODEL_URL);
  const tLoaded = performance.now();
  return { tfjs, model, times: { init: tInit - t0, load: tLoaded - tInit } };
}

async function loadONNX() {
  const t0 = performance.now();
  const ort = await import('onnxruntime-node');
  const tInit = performance.now();
  const session = await ort.InferenceSession.create(ONNX_PATH, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
  });
  const tLoaded = performance.now();
  return { ort, session, times: { init: tInit - t0, load: tLoaded - tInit } };
}

async function runTFJS({ tfjs, model }, img) {
  const input = tfjs.tensor4d(img.data, [1, img.height, img.width, 3]);
  for (let i = 0; i < WARMUP; i++) {
    const y = model.predict(input);
    await y.data();
    y.dispose();
  }
  const times = [];
  let first;
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    const y = model.predict(input);
    const arr = await y.data();
    times.push(performance.now() - t0);
    if (i === 0) first = Float32Array.from(arr);
    y.dispose();
  }
  input.dispose();
  return { stats: stats(times), first };
}

async function runONNX({ ort, session }, img) {
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const dims = [1, img.height, img.width, 3];
  const inputTensor = new ort.Tensor('float32', img.data, dims);

  for (let i = 0; i < WARMUP; i++) {
    const out = await session.run({ [inputName]: inputTensor });
    void out[outputName].data;
  }

  const times = [];
  let first;
  for (let i = 0; i < ITERS; i++) {
    const t0 = performance.now();
    const out = await session.run({ [inputName]: inputTensor });
    const arr = out[outputName].data;
    times.push(performance.now() - t0);
    if (i === 0) first = Float32Array.from(arr);
  }
  return { stats: stats(times), first };
}

function compareOutputs(a, b) {
  if (a.length !== b.length) return { ok: false, reason: `len mismatch: ${a.length} vs ${b.length}` };
  let maxAbs = 0, sumAbs = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > maxAbs) maxAbs = d;
    sumAbs += d;
  }
  return { ok: maxAbs < 1e-3, maxAbs, meanAbs: sumAbs / a.length };
}

async function main() {
  // Silence TF log spam so the table is readable
  process.env.TF_CPP_MIN_LOG_LEVEL = '3';
  console.log(`\nModel: esrgan-medium x4 (~705k params, 2.8 MB)`);
  console.log(`Hardware: CPU (tfjs-node + onnxruntime-node)`);
  console.log(`Warmup: ${WARMUP} iters, measured: ${ITERS} iters per size\n`);

  const tf = await loadTFJS();
  const on = await loadONNX();
  console.log(`Load times:`);
  console.log(`  TF.js   backend init ${fmt(tf.times.init)}   loadLayersModel ${fmt(tf.times.load)}   total ${fmt(tf.times.init + tf.times.load)}`);
  console.log(`  ONNX RT import       ${fmt(on.times.init)}   InferenceSession ${fmt(on.times.load)}   total ${fmt(on.times.init + on.times.load)}`);
  console.log(`\nInference (median of ${ITERS}, after ${WARMUP} warmup):`);
  console.log(`  size   TF.js median   ONNX median   TF.js mean    ONNX mean    speedup   maxAbsDiff`);

  for (const size of SIZES) {
    const img = await loadImageHWC(size);
    const rt = await runTFJS(tf, img);
    const ro = await runONNX(on, img);
    const cmp = compareOutputs(rt.first, ro.first);
    const speedup = rt.stats.median / ro.stats.median;
    console.log(
      `  ${String(size + '→' + size * 4).padEnd(7)}`
      + `${fmt(rt.stats.median)}  `
      + `${fmt(ro.stats.median)}  `
      + `${fmt(rt.stats.mean)}  `
      + `${fmt(ro.stats.mean)}  `
      + `  ${speedup.toFixed(2)}×    `
      + `  ${cmp.maxAbs.toExponential(2)} (${cmp.ok ? 'match' : 'DIFF'})`
    );
  }

  // Patching simulation: upscale a 256×256 image as 16 × 64×64 patches
  // (no overlap/padding — just the inference cost structure of the patch loop)
  console.log(`\nPatch-loop simulation (16 × 64×64 patches, mirrors the upscale pipeline):`);
  const patch = await loadImageHWC(64);
  const PATCHES = 16;

  // TF.js
  {
    const input = tf.tfjs.tensor4d(patch.data, [1, 64, 64, 3]);
    for (let i = 0; i < WARMUP; i++) { const y = tf.model.predict(input); await y.data(); y.dispose(); }
    const t0 = performance.now();
    for (let i = 0; i < PATCHES; i++) {
      const y = tf.model.predict(input);
      await y.data();
      y.dispose();
    }
    const totalTf = performance.now() - t0;
    input.dispose();
    console.log(`  TF.js  16 patches: ${fmt(totalTf)}  (${fmt(totalTf / PATCHES)}/patch)`);
    globalThis.__tfTotal = totalTf;
  }
  // ONNX
  {
    const inputName = on.session.inputNames[0];
    const outputName = on.session.outputNames[0];
    const inputTensor = new on.ort.Tensor('float32', patch.data, [1, 64, 64, 3]);
    for (let i = 0; i < WARMUP; i++) { await on.session.run({ [inputName]: inputTensor }); }
    const t0 = performance.now();
    for (let i = 0; i < PATCHES; i++) {
      const out = await on.session.run({ [inputName]: inputTensor });
      void out[outputName].data;
    }
    const totalOn = performance.now() - t0;
    console.log(`  ONNX   16 patches: ${fmt(totalOn)}  (${fmt(totalOn / PATCHES)}/patch)`);
    console.log(`  speedup (patch loop): ${(globalThis.__tfTotal / totalOn).toFixed(2)}× (ONNX faster)`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
