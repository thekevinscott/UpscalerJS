import { Database } from "./Database";
import * as tf from '@tensorflow/tfjs-node';
import path from 'path';
import { DatasetDefinition } from "./types";
import { mkdirp, mkdirpSync, readFileSync, rmSync, writeFileSync } from "fs-extra";
import { UpscalerModel } from "./UpscalerModel";
import { makeTmpDir } from '../../utils/withTmpDir';
import asyncPool from "tiny-async-pool";
import { Dataset } from "./Dataset";
import { File } from "./File";
import { Package } from "./Package";
import { Image } from "./Image";
import { getSize, ProgressBar, runScript } from "./utils";
import { Metric } from './Metric';
import { Result } from "./Result";
import sequelize from "./sequelize";
import { QueryTypes } from "sequelize";
import Table from "cli-table";

const Upscaler = require('upscaler/node');

export class Benchmarker {
  database: Database;
  cacheDir: string;
  modelPackages: Package[] = [];
  datasets: Dataset[] = [];

  constructor(cacheDir: string) {
    this.database = new Database();
    this.cacheDir = cacheDir;
  }

  async addDatasets(datasets: DatasetDefinition[], resultsOnly?: boolean) {
    for (const datasetDefinition of datasets) {
      const cacheDir = path.resolve(this.cacheDir, datasetDefinition.datasetName);
      await mkdirp(cacheDir);
      const writeFiles = resultsOnly !== true;
      const dataset = await this.database.addDataset(cacheDir, datasetDefinition, writeFiles);
      this.datasets.push(dataset);
    }
  }

  async addModels(modelPackageNames: string[], resultsOnly?: boolean) {
    for (const packageName of modelPackageNames) {
      console.log(`Model ${packageName}`);
      const modelPackage = await this.database.addModelPackage(packageName, resultsOnly);
      this.modelPackages.push(modelPackage);
    }
  }

  async prepareImages(cropSize?: number) {
    for (const dataset of this.datasets) {
      const cacheDir = path.resolve(this.cacheDir, dataset.name);
      await dataset.prepareImages(cacheDir, cropSize);
    }
  }

  async benchmark(cropSize?: number, n?: number) {
    const tmpDir = await makeTmpDir();
    const upscaledFolder = path.resolve(tmpDir, 'upscaled');
    const diffFolder = path.resolve(tmpDir, 'diff');
    const metrics = await Promise.all((await Metric.findAll()).map(async metric => {
      await metric.setId();
      return metric;
    }));

    // we want to test every dataset against every model

    const evaluationPairs: { dataset: Dataset; model: UpscalerModel; }[] = [];
    let total = 0;
    for (const dataset of this.datasets) {
      const files = await dataset.files;
      for (const modelPackage of this.modelPackages) {
        const models = await modelPackage.models;
        for (const model of models) {
          total += files.length;
          evaluationPairs.push({
            dataset,
            model,
          });
        }
      }
    }

    const progressBar = new ProgressBar(total);
    let i = 0;
    for (const { model, dataset } of evaluationPairs) {
      // const { upscaler, modelDefinition } = model;
      const files = await dataset.files;
      const processFile = async (file: File) => {
        const cacheDir = path.resolve(this.cacheDir, dataset.name);
        const image = await file.getImage(cacheDir, model.scale, cropSize);
        let shouldProcess = false;
        for (const metric of metrics) {
          const result = await Result.findOne({
            where: {
              MetricId: metric.id,
              UpscalerModelId: model.id,
              ImageId: image.id,
            },
          });
          if (!result) {
            shouldProcess = true;
            break;
          }
        }
        if (shouldProcess) {
          const { srPath, srHeight, srWidth, lrPath } = image;
          const upscaledBuffer = await this.upscale(model, path.resolve(cacheDir, lrPath));
          const upscaledPath = path.resolve(upscaledFolder, Image.makePath(file.path, Image.getCropKey(cropSize), `${model.scale}x`));
          mkdirpSync(path.dirname(upscaledPath));
          writeFileSync(upscaledPath, upscaledBuffer);
          const upscaledDimensions = await getSize(upscaledPath);

          const diffPath = path.resolve(diffFolder, Image.makePath(file.path, Image.getCropKey(cropSize), `${model.scale}x`));
          mkdirpSync(path.dirname(diffPath));

          if (srWidth !== upscaledDimensions.width || srHeight !== upscaledDimensions.height) {
            throw new Error(`Dimensions mismatch. Original image: ${JSON.stringify({ originalWidth: srWidth, originalHeight: srHeight })}, Upscaled image: ${JSON.stringify(upscaledDimensions)}`)
          }
          await Promise.all(metrics.map(async metric => {
            const value = await this.calculatePerformance(upscaledPath, path.resolve(cacheDir, srPath), diffPath, metric.name);
            await Result.upsert({
              value,
              MetricId: metric.id,
              UpscalerModelId: model.id,
              ImageId: image.id,
            });
          }));
        }
      };

      for await (const value of asyncPool(1, files.slice(0, n), processFile)) {
        i++;
        progressBar.update();
      }
    }
    progressBar.end();

    rmSync(tmpDir, { recursive: true, force: true, })
  }

  private async upscale(model: UpscalerModel, downscaled: string, progress?: (rate: number) => void): Promise<Buffer> {
    const { upscaler } = model;
    const upscaledData = await upscaler.upscale(downscaled, {
      output: 'tensor',
      patchSize: 64,
      padding: 2,
      progress,
    });
    const data = await tf.node.encodePng(upscaledData);
    return Buffer.from(data);
  }

  private async calculatePerformance(upscaledPath: string, originalPath: string, diffPath: string, metric: string): Promise<number> {
    if (!['ssim', 'psnr'].includes(metric)) {
      throw new Error(`Unsupported metric: ${metric}`);
    }
    try {
      const [_, out,] = await runScript(`magick compare -metric ${metric} ${upscaledPath} ${originalPath} ${diffPath}`);
      if (typeof out !== 'string') {
        throw new Error('No response from metric calculation');
      }
      const value = out.split(' ')[0];
      if (!value) {
        throw new Error('No metric found')
      }
      return parseFloat(value);
    } catch (err) {

      throw new Error(`Failed at comparing ${upscaledPath} with ${originalPath}`);
    }
  }

  async display(cropSize: string, metricName?: string) {
    const packages = this.modelPackages;

    const getTableName = (datasetName: string, metricName: string) => [metricName, datasetName].join('_');
    const metrics = metricName === undefined ? ['psnr', 'ssim'] : [metricName];
    const pairs = this.datasets.reduce((arr, dataset) => {
      return arr.concat(metrics.map(metric => [dataset.name, metric]));
    }, [] as [string, string][]);

    const query = `
          SELECT 
          um.name as modelName,
          um.scale as scale,
          um.meta as meta,
          ${pairs.map(([datasetName, metric]) => {
      const tableName = getTableName(datasetName, metric);
      return `${tableName}.value as ${tableName}`;
    }).join(',\n')}
          FROM aggregated_results r
          ${pairs.map(([datasetName, metric]) => {
      const tableName = getTableName(datasetName, metric);
      return `
              LEFT JOIN (
                SELECT 
                value, 
                UpscalerModelId 
                FROM aggregated_results 
                WHERE 
                  MetricId = (SELECT id FROM metrics WHERE name = "${metric}") 
                  AND DatasetId = (SELECT id FROM datasets WHERE name = "${datasetName}")
                  AND cropSize = "${cropSize}"
                ) ${tableName} ON r.UpscalerModelId = ${tableName}.UpscalerModelId
            `
    }).join('\n')}

          LEFT JOIN UpscalerModels um ON um.id = r.UpscalerModelId
          LEFT JOIN Packages p ON p.id = um.PackageId

          WHERE p.name IN(:packageNames)
                    
          GROUP BY r.UpscalerModelId;
      `;
    const results: Record<string, any>[] = await sequelize.query(query, {
      replacements: {
        cropSize,
        packageNames: packages.map(p => p.name),
      },
      type: QueryTypes.SELECT,
    });
    const table = new Table({
      head: ['Model', 'Scale', ...pairs.map(([datasetName, metric]) => [datasetName, metric.toUpperCase()].join('-'))],
    });

    results.forEach(result => {
      table.push([result.modelName, result.scale, ...pairs.map(([datasetName, metric]) => {
        const tableName = getTableName(datasetName, metric);
        return result[tableName];
      })]);
    });

    console.log(table.toString());
  }
}
