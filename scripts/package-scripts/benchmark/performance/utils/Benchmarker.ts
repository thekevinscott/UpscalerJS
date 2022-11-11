import { Database } from "./Database";
import { Package } from "./Package";

export class Benchmarker {
  database: Database = new Database();
  modelPackages: Package[] = [];

  async addModels(modelPackageNames: string[], models?: string[], resultsOnly?: boolean, useGPU = false, callback?: (modelPackage: Package) => void) {
    for (const packageName of modelPackageNames) {
      console.log(`Model ${packageName}`);
      const modelPackage = await this.database.addModelPackage(packageName, models, resultsOnly, useGPU, callback);
      this.modelPackages.push(modelPackage);
    }
  }
}
