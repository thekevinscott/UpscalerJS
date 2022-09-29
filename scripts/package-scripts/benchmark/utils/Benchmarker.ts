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
    for (const dataset of this.datasets) {
      console.log('Dataset name', dataset.name);
      const packages = this.modelPackages;

      const results = await sequelize.query<{
         value: number;
         metric: string;
         datasetName: string;
         modelName: string;
         modelScale: number;
         modelMeta: string;
        }>(`
        SELECT 
        AVG(r.value) as value,
        m.name as metric,
        d.name as datasetName,
        um.name as modelName,
        um.scale as modelScale,
        um.meta as modelMeta

        FROM Results r

        LEFT JOIN Metrics m ON m.id = r.MetricId

        LEFT JOIN UpscalerModels um ON um.id = r.UpscalerModelId
        LEFT JOIN Packages p ON p.id = um.PackageId

        LEFT JOIN Images i ON i.id = r.ImageId
        LEFT JOIN Files f ON f.id = i.FileId
        LEFT JOIN Datasets d ON d.id = f.DatasetId

        WHERE 1=1
        AND p.name IN(:packageNames)
        AND d.name = :datasetName
        AND i.cropSize = :cropSize

        GROUP BY 
        m.name, 
        d.name,
        um.name

        ${metricName ? `AND m.name = :metricName` : ''}
      `, {
        replacements: {
          cropSize,
          metricName,
          datasetName: dataset.name,
          packageNames: packages.map(p => p.name),
        },
        type: QueryTypes.SELECT,
        // logging: console.log,
      });

      if (results.length === 0) {
        console.log(`>> No results found for dataset ${dataset.name}`);
      } else {
        const resultsByModelName: Record<string, any>[] = Object.values(results.reduce((obj, result) => {
          return {
            ...obj,
            [result.modelName]: {
              ...(obj[result.modelName] || {}),
              ...result,
              [result.metric]: result.value,
              meta: JSON.parse(result.modelMeta),
            },
          };
        }, {} as Record<string, any>));
        const table = new Table({
          head: ['Model', 'Scale', ...['PSNR', 'SSIM'].filter(metric => metricName === undefined || metric.toLowerCase() === metricName)],
        });
        resultsByModelName.forEach(result => {
          const row = [result.modelName, result.modelScale, ...[result.psnr, result.ssim].filter(Boolean)];
          table.push(row);
        });
        console.log(table.toString());
      }

    //     results.forEach((result, { modelDefinition, dataset }) => {
    //       const existingResults = resultsByDataset.get(dataset) || [];
    //       resultsByDataset.set(dataset, existingResults.concat([{
    //         result,
    //         modelDefinition,
    //       }]));
    //     });

    //     type ResultByModel = { modelName?: string; modelScale: number; psnr: number; ssim: number };
    //     const data: { dataset: string; results: ResultByModel[]; }[] = [];
    //     resultsByDataset.forEach((results, dataset) => {
    //       const resultsByModel: ResultByModel[] = [];
    //       results.forEach(({ result, modelDefinition }) => {
    //         resultsByModel.push(
    //           {
    //             modelName: (modelDefinition.meta as Record<string, string>).modelName,
    //             modelScale: modelDefinition.scale,
    //             psnr: result.psnr,
    //             ssim: result.ssim,
    //           },
    //         );
    //       });
    //       data.push({
    //         dataset: dataset.datasetName,
    //         results: resultsByModel,
    //       });
    //     });

    //     data.forEach(({ dataset, results }) => {
    //       console.log(`Results for Dataset "${dataset}"`);
    //       const table = new Table({
    //         head: ['Model', 'Scale', 'PSNR', 'SSIM'],
    //       });
    //       results.forEach(({ modelName, modelScale, psnr, ssim }) => {
    //         table.push(
    //           [modelName, modelScale, psnr, ssim],
    //         );
    //       });

    //       console.log(table.toString());
    //     });
        }

  }
}
