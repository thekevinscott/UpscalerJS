/**
 * TODO: Remove this registration once 
 * https://github.com/tensorflow/tfjs/issues/7320
 * is merged and released.
 **/
import type { TF, } from '../../../core/src/index';

export const registerKernels = (tf: TF) => {
  if ('node' in tf) {
    const { Einsum, backend_util, util } = require('@tensorflow/tfjs-core'); // skipcq: JS-0359
    const reshape = require('@tensorflow/tfjs-node/dist/kernels/Reshape').reshapeConfig.kernelFunc; // skipcq: JS-0359
    const transpose = require('@tensorflow/tfjs-node/dist/kernels/Transpose').transposeConfig.kernelFunc; // skipcq: JS-0359
    const multiply = require('@tensorflow/tfjs-node/dist/kernels/Multiply').multiplyConfig.kernelFunc; // skipcq: JS-0359
    const sum = require('@tensorflow/tfjs-node/dist/kernels/Sum').sumConfig.kernelFunc; // skipcq: JS-0359
    const { registerKernel } = require('@tensorflow/tfjs-core'); // skipcq: JS-0359

    const einsum = ({ inputs, backend, attrs }: any) => { //skipcq: JS-0323 
      const { equation } = attrs;
      const tensors = inputs;

      const { allDims, summedDims, idDims } = backend_util.decodeEinsumEquation(equation, tensors.length);
      backend_util.checkEinsumDimSizes(allDims.length, idDims, tensors);
      const { path, steps } = backend_util.getEinsumComputePath(summedDims, idDims);

      const nSteps = steps.length;
      let out = null;
      let numDimsRemaining = allDims.length;
      const tensorsToDispose = [];
      for (let i = 0; i < nSteps; ++i) {
        for (const idTerm of steps[i]) {
          const { permutationIndices: perm, expandDims: dimsToExpand } =
            backend_util.getEinsumPermutation(numDimsRemaining, idDims[idTerm]);
          let x; //skipcq: JS-C1002
          if (backend_util.isIdentityPermutation(perm)) {
            x = tensors[idTerm];
          } else {
            x = transpose({ inputs: { x: tensors[idTerm] }, backend, attrs: { perm } });
            tensorsToDispose.push(x);
          }
          const targetShape = x.shape.slice();
          for (let k = 0; k < dimsToExpand.length; ++k) {
            targetShape.splice(dimsToExpand[k], 0, 1);
          }

          if (!util.arraysEqual(x.shape, targetShape)) {
            // console.log('reshape!');
            x = reshape({ inputs: { x }, backend, attrs: { shape: targetShape } });
            tensorsToDispose.push(x);
          }
          if (out === null) {
            out = x;
          } else {
            // tslint:disable-next-line: no-unnecessary-type-assertion
            out = multiply({ inputs: { a: x, b: out }, backend });
            tensorsToDispose.push(out);
          }
        }
        if (i < nSteps - 1) {
          if (path[i] >= 0) {
            out = sum({
              inputs: { x: out },
              backend,
              attrs: {
                axis: path[i] - (allDims.length - numDimsRemaining),
                keepDims: false
              }
            });
            tensorsToDispose.push(out);
          }
          numDimsRemaining--;
        }
      }

      // Clean up intermediate tensors.
      for (const tensorInfo of tensorsToDispose) {
        if (tensorInfo === out) {
          continue;
        }
        // console.log(backend);
        backend.disposeData(tensorInfo);
      }

      return out;
    }


    registerKernel({
      // ...einsumConfig,
      kernelName: Einsum,
      backendName: 'tensorflow',
      kernelFunc: einsum,
    });
  }
};
