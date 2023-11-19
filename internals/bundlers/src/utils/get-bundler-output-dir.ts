import type { Bundler, } from '../index.js';
import { bundlers, } from "../index.js";
import { TMP_DIR, } from "@internals/common/constants";
import path from "path";

export const ROOT_BUNDLER_OUTPUT_DIR = path.resolve(TMP_DIR, 'bundlers');

export const getBundlerOutputDir = (bundler: typeof Bundler) => {
  const outputDir = bundlers.getOutput(bundler);
  if (!outputDir) {
    throw new Error(`Bundler ${bundler.name} has no output dir defined`);
  }
  return path.resolve(ROOT_BUNDLER_OUTPUT_DIR, outputDir);
};

