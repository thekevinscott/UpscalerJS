import path from 'path';
import * as _tf from '@tensorflow/tfjs-node';
import { checkImage } from '../../lib/utils/checkImage';
import { LOCAL_UPSCALER_NAME } from '../../lib/node/constants';
import { Main, NodeTestRunner } from '../utils/NodeTestRunner';
import { MODELS_DIR, TMP_DIR } from '../../../scripts/package-scripts/utils/constants';
import {
  MultiArgTensorProgress,
} from '../../../packages/upscalerjs/src/shared/types';
import {
  ModelDefinition,
} from '../../../packages/core/src';
import {
  WARNING_PROGRESS_WITHOUT_PATCH_SIZE,
  WARNING_UNDEFINED_PADDING,
  WARNING_INPUT_SIZE_AND_PATCH_SIZE,
  GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR,
} from '../../../packages/upscalerjs/src/shared/errors-and-warnings';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const DEFAULT_MODEL_DIR = path.resolve(MODELS_DIR, 'default-model/test/__fixtures__');

const JEST_TIMEOUT = 60 * 1000 * 5;
jest.setTimeout(JEST_TIMEOUT); // 5 minute timeout

const makeModelAndWeights = (scale: number, batchInputShape: (null | number)[]) => {
  if (scale < 2 || scale > 4) {
    throw new Error('Scale must be between 2 and 4');
  }
  const weightsPath = path.resolve(MODELS_DIR, `pixel-upsampler/models/x${scale}/x${scale}.bin`);
  const weightsName = 'weights.bin';
  const modelJSON = {
    "modelTopology": {
      "class_name": "Sequential",
      "config": {
        "name": "sequential_1",
        "layers": [
          {
            "class_name": "UpSampling2D",
            "config": {
              "size": [
                2,
                2
              ],
              "data_format": "channels_last",
              "name": "up_sampling2d_UpSampling2D1",
              "trainable": true,
              "batch_input_shape": batchInputShape,
              "dtype": "float32"
            }
          }
        ]
      },
    },
    "weightsManifest": [
      {
        "paths": [
          `./${weightsName}`,
        ],
        "weights": [] as unknown[],
      }
    ]
  };
  return {
    modelJSON: JSON.stringify(modelJSON),
    weightsPath: JSON.stringify(weightsPath),
    weightsName: JSON.stringify(weightsName),
  };
};

describe('Node Model Loading Integration Tests', () => {
  describe('Existing Models', () => {
    const main: Main = async (deps) => {
      const {
        Upscaler,
        tf,
        base64ArrayBuffer,
        imagePath,
        model,
        fs,
        usePatchSize = false,
      } = deps;
      // console.log('Running main script with model', JSON.stringify(typeof model === 'function' ? model(tf) : model, null, 2));

      const upscaler = new Upscaler({
        model,
      });

      const imageData = fs.readFileSync(imagePath);
      const tensor = tf.node.decodeImage(imageData).slice([0, 0, 0], [-1, -1, 3]); // discard alpha channel, if exists
      const result = await upscaler.execute(tensor, {
        output: 'tensor',
        patchSize: usePatchSize ? 64 : undefined,
        padding: 6,
        progress: console.log,
      });
      tensor.dispose();
      // because we are requesting a tensor, it is possible that the tensor will
      // contain out-of-bounds pixels; part of the value of this test is ensuring
      // that those values are clipped in a post-process step.
      const upscaledImage = await tf.node.encodePng(result);
      result.dispose();
      return base64ArrayBuffer(upscaledImage);
    };

    const testRunner = new NodeTestRunner({
      main,
      trackTime: false,
      dependencies: {
        'tf': '@tensorflow/tfjs-node',
        'Upscaler': `${LOCAL_UPSCALER_NAME}/node`,
        'fs': 'fs',
        'base64ArrayBuffer': path.resolve(__dirname, '../../lib/utils/base64ArrayBuffer'),
      },
    });

    it("loads the default model", async () => {
      const fixturePath = path.resolve(PIXEL_UPSAMPLER_DIR, 'fixture.png');
      const result = await testRunner.run({
        dependencies: {
        },
        globals: {
          model: 'undefined',
          imagePath: JSON.stringify(fixturePath),
        },
      });
      expect(result).not.toEqual('');
      const formattedResult = `data:image/png;base64,${result}`;
      checkImage(formattedResult, path.resolve(DEFAULT_MODEL_DIR, "result.png"), 'diff.png');
    });

    it("loads a locally exposed model via file:// path", async () => {
      const fixturePath = path.resolve(PIXEL_UPSAMPLER_DIR, 'fixture.png');
      const result = await testRunner.run({
        dependencies: {
        },
        globals: {
          model: JSON.stringify({
            path: 'file://' + path.join(__dirname, '../../../models/pixel-upsampler/models/x4/x4.json'),
            scale: 4,
          }),
          imagePath: JSON.stringify(fixturePath),
        },
      });
      expect(result).not.toEqual('');
      const formattedResult = `data:image/png;base64,${result}`;
      checkImage(formattedResult, path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"), 'diff.png');
    });
  });

  // test the various configurations a model.json can have
  describe('Kinds of Model JSON Configurations', () => {
    interface ProgressResult {
      amount: number;
      shape: number[];
      row: number;
      col: number;
    }
    const main: Main = async (deps) => {
      const {
        Upscaler,
        tf,
        fs,
        path,
        scale,
        imageInputSize,
        patchSize,
        padding,
        modelJSON,
        weightsPath,
        weightsName,
        model,
      } = deps;
      const warnings: string[][] = [];
      console.warn = (...msg) => warnings.push(msg);
      const VERBOSE = false;
      const MODEL_DIR = path.resolve(__dirname);
      const MODEL_JSON_PATH = path.join(MODEL_DIR, 'model.json');
      const WEIGHT_PATH = path.join(MODEL_DIR, weightsName);
      fs.writeFileSync(MODEL_JSON_PATH, JSON.stringify(modelJSON));
      fs.copyFileSync(weightsPath, WEIGHT_PATH);
      model['path'] = 'file://' + MODEL_JSON_PATH;
      // if (VERBOSE) {
      //   console.log('Running main script with model', model, 'and weight', WEIGHT_PATH);
      // }

      const upscaler = new Upscaler({
        model,
      });

      const tensor = tf.randomUniform([...imageInputSize, 3], 0, 1)
      if (VERBOSE) {
        console.log('>> input')
        tensor.print();
      }
      const expectedTensor = tf.image.resizeNearestNeighbor(
        tensor,
        [imageInputSize[0] * scale, imageInputSize[1] * scale],
      );
      if (VERBOSE) {
        console.log('>> expected')
        expectedTensor.print();
      }
      const progressResults: ProgressResult[] = [];
      const progress: MultiArgTensorProgress = (amount, slice, { row, col }) => {
        progressResults.push({
          amount,
          row,
          col,
          shape: slice.shape,
        });
        slice.dispose();
      };
      const result = await upscaler.execute(tensor, {
        output: 'tensor',
        progressOutput: 'tensor',
        patchSize,
        padding,
        progress,
      });
      if (VERBOSE) {
        console.log('>> upscaled')
        result.print();
      }
      tensor.dispose();
      // because we are requesting a tensor, it is possible that the tensor will
      // contain out-of-bounds pixels; part of the value of this test is ensuring
      // that those values are clipped in a post-process step.
      const upscaledImage = [Array.from(result.dataSync()), result.shape];
      result.dispose();
      const expectedImage = [Array.from(expectedTensor.dataSync()), expectedTensor.shape];
      expectedTensor.dispose();
      // console.log('warnings', warnings);
      return JSON.stringify({
        upscaledImage,
        expectedImage,
        progressResults,
        warnings,
      });
    };

    const testRunner = new NodeTestRunner({
      verbose: false,
      main,
      trackTime: false,
      dependencies: {
        'tf': '@tensorflow/tfjs-node',
        'Upscaler': `${LOCAL_UPSCALER_NAME}/node`,
        'fs': 'fs',
      },
    });

    const run = async ({
      imageInputSize,
      patchSize,
      padding,
      scale = 2,
      batchInputShape = [ null, null, null, 3 ],
      model = {},
    }: {
      imageInputSize: [number, number];
      patchSize?: number;
      padding?: number;
      scale?: number;
      batchInputShape?: (null | number)[];
      model?: Partial<ModelDefinition>;
    }): Promise<{
      upscaledImage: [number[], number[]];
      expectedImage: [number[], number[]];
      progressResults: ProgressResult[];
      warnings: string[][];
    }> => {
      const result = await testRunner.run({
        globals: {
          MODELS_DIR: JSON.stringify(path.resolve(__dirname, '../../../models')),
          scale,
          imageInputSize: JSON.stringify(imageInputSize),
          patchSize,
          padding,
          ...makeModelAndWeights(scale, batchInputShape),
          model: JSON.stringify({
            ...model,
            scale,
          }),
        },
      });
      return JSON.parse(result?.toString() || '');
    }

    describe('Models with dynamic input shapes', () => {
      it("loads a small image", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [2, 2],
          scale: 2,
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(0);
        expect(warnings.length).toEqual(1); // warn about progress being present without patch size
        expect(warnings[0][0]).toEqual(WARNING_PROGRESS_WITHOUT_PATCH_SIZE)
      });

      it("loads a small image with a patch size that is larger", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [2, 2],
          scale: 2,
          patchSize: 4,
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(1);
        expect(progressResults[0].amount).toEqual(1);
        expect(progressResults[0].row).toEqual(0);
        expect(progressResults[0].col).toEqual(0);
        expect(warnings.length).toEqual(1); // warn about patch size being present without padding
        expect(warnings[0][0]).toEqual(WARNING_UNDEFINED_PADDING)
      });

      it("loads a larger image with a patch size", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [8, 8],
          scale: 2,
          patchSize: 4,
          padding: 0,
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(4);
        expect(progressResults[0].amount).toEqual(.25);
        expect(progressResults[0].row).toEqual(0);
        expect(progressResults[0].col).toEqual(0);
        expect(progressResults[1].amount).toEqual(.5);
        expect(progressResults[1].row).toEqual(0);
        expect(progressResults[1].col).toEqual(1);
        expect(progressResults[2].amount).toEqual(.75);
        expect(progressResults[2].row).toEqual(1);
        expect(progressResults[2].col).toEqual(0);
        expect(progressResults[3].amount).toEqual(1);
        expect(progressResults[3].row).toEqual(1);
        expect(progressResults[3].col).toEqual(1);
        expect(warnings.length).toEqual(0); // no expected warnings
      });

      it("loads a ragged wide image", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [3, 7],
          scale: 2,
          patchSize: 4,
          padding: 0,
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(2);
        expect(progressResults[0].amount).toEqual(.5);
        expect(progressResults[0].row).toEqual(0);
        expect(progressResults[0].col).toEqual(0);
        expect(progressResults[1].amount).toEqual(1);
        expect(progressResults[1].row).toEqual(0);
        expect(progressResults[1].col).toEqual(1);
        expect(warnings.length).toEqual(0); // no expected warnings
      });

      it("loads a ragged tall image", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [7, 3],
          scale: 2,
          patchSize: 4,
          padding: 0,
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(2);
        expect(progressResults[0].amount).toEqual(.5);
        expect(progressResults[0].row).toEqual(0);
        expect(progressResults[0].col).toEqual(0);
        expect(progressResults[1].amount).toEqual(1);
        expect(progressResults[1].row).toEqual(1);
        expect(progressResults[1].col).toEqual(0);
        expect(warnings.length).toEqual(0); // no expected warnings
      });

      it("loads a ragged tall image with padding", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [7, 3],
          scale: 2,
          patchSize: 6,
          padding: 1,
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(2);
        expect(progressResults[0].amount).toEqual(.5);
        expect(progressResults[0].row).toEqual(0);
        expect(progressResults[0].col).toEqual(0);
        expect(progressResults[1].amount).toEqual(1);
        expect(progressResults[1].row).toEqual(1);
        expect(progressResults[1].col).toEqual(0);
        expect(warnings.length).toEqual(0); // no expected warnings
      });
    });

    describe('Models with fixed input shapes', () => {
      it("loads an image smaller than the fixed input size", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [2, 2],
          scale: 2,
          batchInputShape: [null, 4, 4, 3],
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(1); // For a model with a fixed input size, progress will be called automatically if present
        expect(warnings.length).toEqual(0); // there should be no warnings about progress being present without patch size
      });

      it("loads an image equal to the fixed input size", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [2, 2],
          scale: 2,
          batchInputShape: [null, 2, 2, 3],
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(1);
        expect(warnings.length).toEqual(0); // there should be no warnings about progress being present without patch size
      });

      it("loads an image greater than the fixed input size", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [4, 4],
          scale: 2,
          batchInputShape: [null, 2, 2, 3],
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(4);
        expect(progressResults[0].amount).toEqual(.25);
        expect(progressResults[0].row).toEqual(0);
        expect(progressResults[0].col).toEqual(0);
        expect(progressResults[1].amount).toEqual(.5);
        expect(progressResults[1].row).toEqual(0);
        expect(progressResults[1].col).toEqual(1);
        expect(progressResults[2].amount).toEqual(.75);
        expect(progressResults[2].row).toEqual(1);
        expect(progressResults[2].col).toEqual(0);
        expect(progressResults[3].amount).toEqual(1);
        expect(progressResults[3].row).toEqual(1);
        expect(progressResults[3].col).toEqual(1);
        expect(warnings.length).toEqual(0); // there should be no warnings about progress being present without patch size
      });

      it("loads an image greater than the fixed input size with a patch size", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [4, 4],
          scale: 2,
          batchInputShape: [null, 2, 2, 3],
          patchSize: 3,
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(4);
        expect(progressResults[0].amount).toEqual(.25);
        expect(progressResults[0].row).toEqual(0);
        expect(progressResults[0].col).toEqual(0);
        expect(progressResults[1].amount).toEqual(.5);
        expect(progressResults[1].row).toEqual(0);
        expect(progressResults[1].col).toEqual(1);
        expect(progressResults[2].amount).toEqual(.75);
        expect(progressResults[2].row).toEqual(1);
        expect(progressResults[2].col).toEqual(0);
        expect(progressResults[3].amount).toEqual(1);
        expect(progressResults[3].row).toEqual(1);
        expect(progressResults[3].col).toEqual(1);
        expect(warnings.length).toEqual(1); // warn about patch size being present but the model having a fixed input size
        expect(warnings[0][0]).toEqual(WARNING_INPUT_SIZE_AND_PATCH_SIZE)
      });

      describe('Ragged shapes', () => {
        it("loads a ragged tall image", async () => {
          const {
            upscaledImage: [
              upscaledData,
              upscaledShape,
            ],
            expectedImage: [
              expectedData,
              expectedShape,
            ],
            progressResults,
            warnings,
          } = await run({
            imageInputSize: [7, 3],
            scale: 2,
            batchInputShape: [null, 4, 4, 3],
          });
          expect(upscaledShape).toEqual(expectedShape);
          expect(upscaledData).toEqual(expectedData);
          expect(progressResults.length).toEqual(2);
          expect(progressResults[0].amount).toEqual(.5);
          expect(progressResults[0].row).toEqual(0);
          expect(progressResults[0].col).toEqual(0);
          expect(progressResults[1].amount).toEqual(1);
          expect(progressResults[1].row).toEqual(1);
          expect(progressResults[1].col).toEqual(0);
          expect(warnings.length).toEqual(0);
        });

        it("loads a ragged wide image", async () => {
          const {
            upscaledImage: [
              upscaledData,
              upscaledShape,
            ],
            expectedImage: [
              expectedData,
              expectedShape,
            ],
            progressResults,
            warnings,
          } = await run({
            imageInputSize: [3, 7],
            scale: 2,
            batchInputShape: [null, 4, 4, 3],
          });
          expect(upscaledShape).toEqual(expectedShape);
          expect(upscaledData).toEqual(expectedData);
          expect(progressResults.length).toEqual(2);
          expect(progressResults[0].amount).toEqual(.5);
          expect(progressResults[0].row).toEqual(0);
          expect(progressResults[0].col).toEqual(0);
          expect(progressResults[1].amount).toEqual(1);
          expect(progressResults[1].row).toEqual(0);
          expect(progressResults[1].col).toEqual(1);
          expect(warnings.length).toEqual(0);
        });
      });
    });

    describe('Models with divisibility factors', () => {
      it("loads an image that is a multiple", async () => {
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [8, 8],
          scale: 2,
          batchInputShape: [null, null, null, 3],
          model: {
            divisibilityFactor: 4,
          },
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(0);
        expect(warnings.length).toEqual(1); // warn about progress being present without patch size
        expect(warnings[0][0]).toEqual(WARNING_PROGRESS_WITHOUT_PATCH_SIZE)
      });

      it("loads an image that is smaller than the divisibility", async () => {
        // expect the image to be padded and then trimmed
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [3, 3],
          scale: 2,
          batchInputShape: [null, null, null, 3],
          model: {
            divisibilityFactor: 4,
          },
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(0);
        expect(warnings.length).toEqual(1); // warn about progress being present without patch size
        expect(warnings[0][0]).toEqual(WARNING_PROGRESS_WITHOUT_PATCH_SIZE)
      });

      it("loads an image that is larger than the minimum divisibility, but not fully divisible", async () => {
        // expect the image to be padded and then trimmed
        const {
          upscaledImage: [
            upscaledData,
            upscaledShape,
          ],
          expectedImage: [
            expectedData,
            expectedShape,
          ],
          progressResults,
          warnings,
        } = await run({
          imageInputSize: [5, 5],
          scale: 2,
          batchInputShape: [null, null, null, 3],
          model: {
            divisibilityFactor: 4,
          },
        });
        expect(upscaledShape).toEqual(expectedShape);
        expect(upscaledData).toEqual(expectedData);
        expect(progressResults.length).toEqual(0);
        expect(warnings.length).toEqual(1); // warn about progress being present without patch size
        expect(warnings[0][0]).toEqual(WARNING_PROGRESS_WITHOUT_PATCH_SIZE)
      });

      describe('Patch sizes', () => {
        it("loads an image with a patch size equal to divisibility", async () => {
          const {
            upscaledImage: [
              upscaledData,
              upscaledShape,
            ],
            expectedImage: [
              expectedData,
              expectedShape,
            ],
            progressResults,
            warnings,
          } = await run({
            imageInputSize: [5, 5],
            scale: 2,
            batchInputShape: [null, null, null, 3],
            patchSize: 4,
            padding: 0,
            model: {
              divisibilityFactor: 4,
            },
          });
          expect(upscaledShape).toEqual(expectedShape);
          expect(upscaledData).toEqual(expectedData);
          expect(progressResults.length).toEqual(4);
          expect(progressResults[0].amount).toEqual(.25);
          expect(progressResults[0].row).toEqual(0);
          expect(progressResults[0].col).toEqual(0);
          expect(progressResults[1].amount).toEqual(.5);
          expect(progressResults[1].row).toEqual(0);
          expect(progressResults[1].col).toEqual(1);
          expect(progressResults[2].amount).toEqual(.75);
          expect(progressResults[2].row).toEqual(1);
          expect(progressResults[2].col).toEqual(0);
          expect(progressResults[3].amount).toEqual(1);
          expect(progressResults[3].row).toEqual(1);
          expect(progressResults[3].col).toEqual(1);
          expect(warnings).toEqual([]);
        });

        it("loads an image with a patch size equal to a multiple of divisibility", async () => {
          const {
            upscaledImage: [
              upscaledData,
              upscaledShape,
            ],
            expectedImage: [
              expectedData,
              expectedShape,
            ],
            progressResults,
            warnings,
          } = await run({
            imageInputSize: [9, 9],
            scale: 2,
            batchInputShape: [null, null, null, 3],
            patchSize: 8,
            padding: 0,
            model: {
              divisibilityFactor: 4,
            },
          });
          expect(upscaledShape).toEqual(expectedShape);
          expect(upscaledData).toEqual(expectedData);
          expect(progressResults.length).toEqual(4);
          expect(progressResults[0].amount).toEqual(.25);
          expect(progressResults[0].row).toEqual(0);
          expect(progressResults[0].col).toEqual(0);
          expect(progressResults[1].amount).toEqual(.5);
          expect(progressResults[1].row).toEqual(0);
          expect(progressResults[1].col).toEqual(1);
          expect(progressResults[2].amount).toEqual(.75);
          expect(progressResults[2].row).toEqual(1);
          expect(progressResults[2].col).toEqual(0);
          expect(progressResults[3].amount).toEqual(1);
          expect(progressResults[3].row).toEqual(1);
          expect(progressResults[3].col).toEqual(1);
          expect(warnings).toEqual([]);
        });

        it("loads an image with a patch size smaller than a multiple of divisibility", async () => {
          const patchSize = 3;
          const divisibilityFactor = 4;
          const {
            upscaledImage: [
              upscaledData,
              upscaledShape,
            ],
            expectedImage: [
              expectedData,
              expectedShape,
            ],
            progressResults,
            warnings,
          } = await run({
            imageInputSize: [5, 5],
            scale: 2,
            batchInputShape: [null, null, null, 3],
            patchSize,
            model: {
              divisibilityFactor,
            },
          });
          expect(upscaledShape).toEqual(expectedShape);
          expect(upscaledData).toEqual(expectedData);
          expect(progressResults.length).toEqual(4);
          expect(progressResults[0].amount).toEqual(.25);
          expect(progressResults[0].row).toEqual(0);
          expect(progressResults[0].col).toEqual(0);
          expect(progressResults[1].amount).toEqual(.5);
          expect(progressResults[1].row).toEqual(0);
          expect(progressResults[1].col).toEqual(1);
          expect(progressResults[2].amount).toEqual(.75);
          expect(progressResults[2].row).toEqual(1);
          expect(progressResults[2].col).toEqual(0);
          expect(progressResults[3].amount).toEqual(1);
          expect(progressResults[3].row).toEqual(1);
          expect(progressResults[3].col).toEqual(1);
          expect(warnings).toEqual([[
            WARNING_UNDEFINED_PADDING,
          ],[
            GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR(patchSize, divisibilityFactor, divisibilityFactor),
          ]]);
        });

        it("loads an image with a patch size larger than a multiple of divisibility", async () => {
          const patchSize = 5;
          const divisibilityFactor = 4;
          const expectedPatchSize = 8;
          const {
            upscaledImage: [
              upscaledData,
              upscaledShape,
            ],
            expectedImage: [
              expectedData,
              expectedShape,
            ],
            progressResults,
            warnings,
          } = await run({
            imageInputSize: [5, 5],
            scale: 2,
            batchInputShape: [null, null, null, 3],
            patchSize,
            model: {
              divisibilityFactor,
            },
          });
          expect(upscaledShape).toEqual(expectedShape);
          expect(upscaledData).toEqual(expectedData);
          expect(progressResults.length).toEqual(1);
          expect(progressResults[0].amount).toEqual(1);
          expect(progressResults[0].row).toEqual(0);
          expect(progressResults[0].col).toEqual(0);
          expect(warnings).toEqual([[
            WARNING_UNDEFINED_PADDING,
          ],[
            GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR(patchSize, divisibilityFactor, expectedPatchSize),
          ]]);
        });
      });
    });
  });
});
