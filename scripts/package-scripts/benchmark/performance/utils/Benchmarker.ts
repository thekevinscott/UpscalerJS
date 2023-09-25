import { readFileSync } from 'fs-extra';
import path from 'path';
import { Database } from "./Database";
import { Package } from "./Package";
import { MODELS_DIR } from '../../../utils/constants.mjs';

const getIsExperimentalPackage = (packageName: string) => {
  const packageJSON = JSON.parse(readFileSync(path.resolve(MODELS_DIR, packageName, 'package.json'), 'utf-8'));
  const experimental = packageJSON['@upscalerjs']?.['model']?.['experimental'];
  return !!experimental;
};

export class Benchmarker {
  database: Database = new Database();
  modelPackages: Package[] = [];

  async addModels(modelPackageNames: string[], models?: string[], resultsOnly?: boolean, useGPU = false, callback?: (modelPackage: Package) => void) {
    for (const packageName of modelPackageNames) {
      console.log(`Model ${packageName}`);
      const experimental = getIsExperimentalPackage(packageName);
      const modelPackage = await this.database.addModelPackage(packageName, experimental, models, resultsOnly, useGPU, callback);
      this.modelPackages.push(modelPackage);
    }
  }
}
