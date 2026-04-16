"""
Work around a WebGPU correctness bug in onnxruntime-web on Apple Metal
(and other adapters that honour the WebGPU spec default of
`maxStorageBuffersPerShaderStage = 8`): a single Concat op with >=9
inputs generates a compute pipeline that binds one storage buffer per
input, which the adapter rejects with:

  The number of storage buffers (11) in the Compute stage exceeds the
  maximum per-stage limit (8).
  [Invalid ComputePipeline "Concat"] is invalid.

The ort session keeps submitting invalid command buffers — timing looks
fast, but the output is garbage (fails a parity check against any other
backend).

Fix: replace every N-input Concat (N>=9) with a chain of pairwise
Concats along the same axis. Graph is mathematically equivalent; the
WebGPU EP generates a pipeline per pairwise op, each well within the
8-buffer ceiling.

Usage:
    python split-concat.py <in.onnx> <out.onnx> [--max-inputs 8]

Verifies numerical parity via onnxruntime-cpu on a random input.
"""
import argparse
import sys
import numpy as np
import onnx
from onnx import helper


def split_concat(model: onnx.ModelProto, max_inputs: int) -> int:
    """Replace every Concat with >max_inputs inputs by a chain of
    pairwise Concats. Returns the number of nodes rewritten."""
    g = model.graph
    new_nodes = []
    rewrites = 0
    counter = [0]

    def next_name(base: str) -> str:
        counter[0] += 1
        return f'{base}__split_{counter[0]}'

    for node in g.node:
        if node.op_type != 'Concat' or len(node.input) <= max_inputs:
            new_nodes.append(node)
            continue

        axis = next(a.i for a in node.attribute if a.name == 'axis')
        inputs = list(node.input)
        original_output = node.output[0]

        # Build a left-fold chain of pairwise concats.
        acc = inputs[0]
        for i, x in enumerate(inputs[1:]):
            is_last = (i == len(inputs) - 2)
            out_name = original_output if is_last else next_name(original_output)
            new_nodes.append(helper.make_node(
                'Concat',
                inputs=[acc, x],
                outputs=[out_name],
                name=next_name(node.name or 'Concat'),
                axis=axis,
            ))
            acc = out_name
        rewrites += 1

    del g.node[:]
    g.node.extend(new_nodes)
    return rewrites


def random_input(model: onnx.ModelProto) -> dict:
    feeds = {}
    for inp in model.graph.input:
        dims = []
        for d in inp.type.tensor_type.shape.dim:
            if d.HasField('dim_value') and d.dim_value > 0:
                dims.append(d.dim_value)
            else:
                # dynamic dim — pick something reasonable
                dims.append(1 if len(dims) == 0 else 64 if len(dims) in (1, 2) else 3)
        feeds[inp.name] = np.random.RandomState(0).rand(*dims).astype(np.float32)
    return feeds


def parity_check(orig_path: str, patched_path: str) -> tuple[float, float]:
    import onnxruntime as ort
    orig = onnx.load(orig_path)
    feeds = random_input(orig)
    s1 = ort.InferenceSession(orig_path, providers=['CPUExecutionProvider'])
    s2 = ort.InferenceSession(patched_path, providers=['CPUExecutionProvider'])
    o1 = s1.run(None, feeds)[0]
    o2 = s2.run(None, feeds)[0]
    diff = np.abs(o1.astype(np.float64) - o2.astype(np.float64))
    return float(diff.max()), float(diff.mean())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('in_path')
    ap.add_argument('out_path')
    ap.add_argument('--max-inputs', type=int, default=8,
                    help='Concat ops with more inputs than this are split. Default 8.')
    args = ap.parse_args()

    model = onnx.load(args.in_path)

    # Report what we're about to do.
    big_concats = [(n.name, len(n.input)) for n in model.graph.node
                   if n.op_type == 'Concat' and len(n.input) > args.max_inputs]
    print(f'Concat ops with >{args.max_inputs} inputs: {len(big_concats)}')
    for name, k in big_concats:
        print(f'  {name!r}: {k} inputs')

    if not big_concats:
        print('Nothing to rewrite.')
        sys.exit(0)

    rewrites = split_concat(model, args.max_inputs)
    onnx.checker.check_model(model)
    onnx.save(model, args.out_path)
    print(f'Rewrote {rewrites} Concat node(s). Saved to {args.out_path}')

    max_abs, mean_abs = parity_check(args.in_path, args.out_path)
    print(f'Parity vs original: max-abs={max_abs:.2e}, mean-abs={mean_abs:.2e}')
    if max_abs > 1e-5:
        print('WARNING: parity check above 1e-5 — investigate before using.')
        sys.exit(1)


if __name__ == '__main__':
    main()
