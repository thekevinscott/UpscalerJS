import { ALL_MODELS, ModelInformation, } from '@internals/common/models';

const alertAvailableModels = async () => {
  const modelPackages = await ALL_MODELS;
  const availableModels = await Promise.all(modelPackages.map(async ({ packageName, modelName }) => ([
      `- ${packageName}/${modelName}}`,
  ])));
  return new Error([
    'No models were found for filter',
    'Available models:',
    ...availableModels,
  ].join('\n'));
}

export const getFilteredModels = async ({
  specificModel,
  specificPackage,
  filter = (_packageName, _model) => true,
}: {
  specificPackage?: string;
  specificModel?: string;
  filter?: (packageName: string, modelName: string) => (boolean | Promise<boolean>);
  } = {}): Promise<ModelInformation[]> => {
  const filteredPackagesAndModels: ModelInformation[] = [];
  for (const model of await ALL_MODELS) {
    if (specificPackage === undefined || model.packageDirectoryName === specificPackage) {
      if (specificModel === undefined || model.modelName.substring(2) === specificModel) {
        if (await filter(model.packageDirectoryName, model.modelName)) {
          filteredPackagesAndModels.push(model);
        }
      }
    }
  }

  if (filteredPackagesAndModels.length === 0) {
    throw await alertAvailableModels();
  }

  return filteredPackagesAndModels;
};
