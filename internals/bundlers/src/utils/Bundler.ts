import path from 'path';
import { RegistryPackage } from "@internals/registry";
import { HttpServer } from "../../../http-server/src/index.js";
import { info } from "@internals/common/logger";

export interface BundleOptions {
  skipNpmInstall?: boolean;
  keepWorkingFiles?: boolean;
}

export class Bundler {
  packages: Promise<RegistryPackage[]> = Promise.resolve([]);
  server?: HttpServer;
  public dist: string = 'dist';
  public outDir: string;
  public usesRegistry = true;

  constructor(outDir: string) {
    this.outDir = outDir;
  }

  get name(): string {
    throw new Error("Extend this class and implement the name getter");
    return '';
  }

  get absoluteDistFolder() {
    return path.resolve(this.outDir, this.dist);
  }

  async bundle(_registryURL?: string, _options?: BundleOptions) {
    info(`Bundling ${this.name}...`);
    throw new Error('Bundle is a method that must be implemented by subclasses');
  }
}
