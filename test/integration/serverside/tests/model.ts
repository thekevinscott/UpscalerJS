import path from 'path';
// import fs from 'fs';
import * as _tf from '@tensorflow/tfjs-node';
// import { checkImage } from '../../lib/utils/checkImage';
// import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from '../../lib/node/constants';
import { MODELS_DIR } from '@internals/common/constants';
// import {
//   MultiArgTensorProgress,
// } from '../../../../packages/upscalerjs/src/types.js';
import {
  ModelDefinition,
} from '../../../../packages/core/src/index.js';
import {
  WARNING_PROGRESS_WITHOUT_PATCH_SIZE,
  WARNING_UNDEFINED_PADDING,
  WARNING_INPUT_SIZE_AND_PATCH_SIZE,
  GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR,
} from '../../../../packages/upscalerjs/src/errors-and-warnings.js';
import { getTemplate } from '@internals/common/get-template';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import { withTmpDir } from '@internals/common/tmp-dir';
import { writeFile } from 'fs-extra';
import { copyFile } from '@internals/common/fs';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const DEFAULT_MODEL_DIR = path.resolve(MODELS_DIR, 'default-model/test/__fixtures__');

const USE_GPU = process.env.useGPU === '1';
const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const NODE_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'node');

const makeModelAndWeights = (scale: number, batchInputShape: (null | number)[]) => {
  if (scale < 2 || scale > 4) {
    throw new Error('Scale must be between 2 and 4');
  }
  const weightsPath = path.resolve(MODELS_DIR, `pixel-upsampler/models/${scale}x/${scale}x.bin`);
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
    modelJSON: modelJSON,
    weightsPath: weightsPath,
    weightsName: weightsName,
  };
};

describe('Node Model Loading Integration Tests', () => {
  const testRunner = new ServersideTestRunner({
    trackTime: false,
    cwd: NODE_DIST_FOLDER,
  });
  describe('Existing Models', () => {
    const runTestForExistingModels = async ({
      image,
      fixture,
      model,
    }: {
      image: string;
      fixture?: string;
      model?: string;
    }) => {
      const script = await getTemplate(path.resolve(__dirname, '../_templates/model/existing-model.js.t'), {
        tf: USE_GPU ? `@tensorflow/tfjs-node-gpu` : `@tensorflow/tfjs-node`,
        upscaler: USE_GPU ? `upscaler/node-gpu` : `upscaler/node`,
        image,
        model,
      });
      const buffer = await testRunner.run(script);
      const result = buffer.toString('utf-8');
      if (!fixture) {
        throw new Error('No fixture provided, which may be expected if we expect an error to be thrown')
      }
      expect(`data:image/png;base64,${result}`).toMatchImage(fixture);
    };

    it("loads the default model", async () => {
      const image = path.resolve(PIXEL_UPSAMPLER_DIR, 'fixture.png');

      await runTestForExistingModels({
        image: JSON.stringify(image),
        fixture: path.resolve(DEFAULT_MODEL_DIR, "result.png"),
      });
    });

    it("loads a locally exposed model via file:// path", async () => {
      const image = path.resolve(PIXEL_UPSAMPLER_DIR, 'fixture.png');
      await runTestForExistingModels({
        image: JSON.stringify(image),
        fixture: path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"),
        model: JSON.stringify({
          path: 'file://' + path.join(__dirname, '../../../../models/pixel-upsampler/models/4x/4x.json'),
          scale: 4,
        }),
      });
    });
  });

  // test the various configurations a model.json can have
  describe('Kinds of Model JSON Configurations', () => {
    const runTestForKindsOfModelConfigurations = async ({
      imageInputSize,
      patchSize,
      padding,
      scale = 2,
      batchInputShape = [ null, null, null, 3 ],
      model = {},
    }: {
      scale: number;
      imageInputSize: [number, number];
      patchSize?: number;
      padding?: number;
      batchInputShape?: (null | number)[];
      model?: Partial<ModelDefinition>;
    }): Promise<{
      upscaledImage: [number[], number[]];
      expectedImage: [number[], number[]];
      progressResults: ProgressResult[];
      warnings: string[][];
    }> => {
      const buffer = await withTmpDir(async (tmpDir) => {
        const { modelJSON, weightsName, weightsPath } = await makeModelAndWeights(scale, batchInputShape);
        const modelJSONPath = path.resolve(tmpDir, 'model.json');
        const modelWeightPath = path.resolve(tmpDir, weightsName);

        await Promise.all([
          copyFile(weightsPath, modelWeightPath),
          writeFile(modelJSONPath, JSON.stringify(modelJSON)),
        ]);

        const script = await getTemplate(path.resolve(__dirname, '../_templates/model/kinds-of-model-configurations.js.t'), {
          tf: USE_GPU ? `@tensorflow/tfjs-node-gpu` : `@tensorflow/tfjs-node`,
          upscaler: USE_GPU ? `upscaler/node-gpu` : `upscaler/node`,
          scale,
          imageInputSize: JSON.stringify(imageInputSize),
          modelJSONPath,
          modelWeightPath,
          patchSize,
          padding,
          tmpDir: JSON.stringify(tmpDir),
          model: JSON.stringify({
            scale,
            path: `file://${modelJSONPath}`,
            ...model,
          }),
        });
        return testRunner.run(script);
      });
      return JSON.parse(buffer.toString('utf-8'));
    };
    interface ProgressResult {
      amount: number;
      shape: number[];
      row: number;
      col: number;
    }

    const testRunner = new ServersideTestRunner({
      trackTime: false,
      cwd: NODE_DIST_FOLDER,
    });

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
        } = await runTestForKindsOfModelConfigurations({
          scale: 2,
          imageInputSize: [2, 2],
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
        } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
          } = await runTestForKindsOfModelConfigurations({
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
          } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
        } = await runTestForKindsOfModelConfigurations({
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
          } = await runTestForKindsOfModelConfigurations({
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
          } = await runTestForKindsOfModelConfigurations({
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
          } = await runTestForKindsOfModelConfigurations({
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
          } = await runTestForKindsOfModelConfigurations({
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
