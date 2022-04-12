import { tf, } from './dependencies.generated';
import { ModelDefinition, PackageInformation, } from './types';

const CDNS = [
  (packageName: string, version: string, path: string) => `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${path}`,
  (packageName: string, version: string, path: string) => `https://unpkg.com/${packageName}@${version}/${path}`,
  // 'cdnjs',
];
// import MODELS, { DEFAULT_MODEL, } from './models';
// import { warn, } from './utils';

// const ERROR_URL_EXPLICIT_SCALE_REQUIRED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-must-provide-an-explicit-scale';
// const ERROR_URL_EXPLICIT_SCALE_DISALLOWED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-are-requesting-the-pretrained-model-but-are-providing-an-explicit-scale';

// const DEFAULT_MODEL_DEFINITION: ModelDefinition = {
//   url: 'foo',
//   scale: 2,
// };

const getURL = async (modelPath: string, checksum?: string) => {
  // https://cdn.jsdelivr.net/npm/@upscalerjs/pixel-upsampler@latest/models/model.json
  // https://unpkg.com/@upscalerjs/pixel-upsampler@latest/models/model.json
};

const fetchModel = async ({ name, version }: PackageInformation, modelPath: string) => {
  for (let i = 0; i < CDNS.length; i++) {
    const getCDN = CDNS[i];
    try {
      const url = getCDN(name, version, modelPath);
      return await tf.loadLayersModel(url);
    } catch(err) {
      // there was an issue with the CDN, try another
    }
  }
  throw new Error(`Could not resolve URL ${modelPath}`)
};

const loadModel = async (
  modelDefinition?: ModelDefinition,
): Promise<{
  model: tf.LayersModel;
  modelDefinition: ModelDefinition;
}> => {
  if (!modelDefinition) {
    throw new Error('No model definition provided');
  }
  if (modelDefinition.customLayers) {
    modelDefinition.customLayers.forEach((layer) => {
      tf.serialization.registerClass(layer);
    });
  }

  if (!modelDefinition.packageInformation) {
    throw new Error('No package information')
  }

  const model = await fetchModel(modelDefinition.packageInformation, modelDefinition.path);
  // let packagePath = path.dirname(require.resolve("moduleName/package.json"));
  // console.log('ppackagePath', packagePath)
  // const modelPath = await getURL(modelDefinition.path, modelDefinition.pathChecksum);
  // const model = await tf.loadLayersModel(modelPath);

  return {
    model,
    modelDefinition,
  };
};

export default loadModel;
