import { Database } from "./Database";
import os from 'os';
import * as tf from '@tensorflow/tfjs-node';
import path from 'path';
import { DatasetDefinition } from "./types";
import { mkdirp, mkdirpSync, writeFileSync } from "fs-extra";
import { UpscalerModel } from "./UpscalerModel";
import asyncPool from "tiny-async-pool";
import { Dataset } from "./Dataset";
import { Package } from "./Package";
import { Image } from "./Image";
import { getSize, runScript } from "./utils";
import { Metric } from './Metric';
import { Result } from "./Result";
import sequelize from "./sequelize";
import { Model, QueryTypes } from "sequelize";
import Table from "cli-table";
import { ProgressBar } from "../../utils/ProgressBar";

const Upscaler = require('upscaler/node');

interface FileAndImage {
  datasetName: string;
  scale: number;
  imageId: number;
  srPath: string;
  srHeight: number;
  srWidth: number;
  lrPath: string;
}

interface ExistingResult {
  MetricId: number;
  UpscalerModelId: number;
  ImageId: number;
}

export class Benchmarker {
  database: Database;
  cacheDir: string;
  modelPackages: Package[] = [];
  datasets: Dataset[] = [];

  constructor(cacheDir: string) {
    this.database = new Database();
    this.cacheDir = cacheDir;
  }

  async addDatasets(datasets: DatasetDefinition[], cropSize?: number, resultsOnly?: boolean) {
    for (const datasetDefinition of datasets) {
      const cacheDir = path.resolve(this.cacheDir, datasetDefinition.datasetName);
      await mkdirp(cacheDir);
      const writeFiles = resultsOnly !== true;
      const dataset = await this.database.addDataset(cacheDir, datasetDefinition, writeFiles, cropSize);
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

  private existingResults?: Set<string>;
  async queryForExistingResults(metrics: Metric[], modelIds: number[], cropSize?: number) {
    const cropKey = Image.getCropKey(cropSize);
    const queryResults = await sequelize.query<ExistingResult>(`
    SELECT MetricId, UpscalerModelId, ImageId FROM results r
      LEFT JOIN images i ON i.id = r.ImageId
      LEFT JOIN files f ON f.id = i.FileId
      LEFT JOIN datasets d ON d.id = f.DatasetId
      WHERE 1=1
      AND i.cropSize = :cropKey
      AND r.UpscalerModelId IN(:modelIds)
      AND r.MetricId IN(:metricIds)
      AND d.id IN(:datasetIds)
    `, {
      replacements: {
        cropKey,
        datasetIds: this.datasets.map(dataset => dataset.id),
        metricIds: metrics.map(metric => metric.id),
        modelIds,
      },
      type: QueryTypes.SELECT,
    });
    if (!this.existingResults) {
      this.existingResults = new Set();
    }
    for (const result of queryResults) {
      this.existingResults.add(getKeyForExistingResults(result));
    }
  }

  hasExistingResult(modelId: number, metricId: number, imageId: number) {
    if (this.existingResults === undefined) {
      throw new Error('No existing results have been queried yet');
    }
    const key = getKeyForExistingResults({
      UpscalerModelId: modelId,
      MetricId: metricId,
      ImageId: imageId,
    });
    return this.existingResults.has(key);
  }

  async benchmarkFile(dataset: Dataset, model: UpscalerModel, image: FileAndImage, metrics: Metric[], cropSize: undefined | number, {
    delay,
  }: {
    delay: number, 
  }) {
    const cacheDir = path.resolve(this.cacheDir, dataset.name);
    let shouldProcess = false;
    for (const metric of metrics) {
      const isExisting = this.hasExistingResult(model.id, metric.id, image.imageId);
      if (isExisting === false) {
        shouldProcess = true;
        break;
      }
    }
    if (shouldProcess) {
      const cropKey = Image.getCropKey(cropSize);
      const tmpDir = os.tmpdir();
      const upscaledFolder = path.resolve(tmpDir, `${image.imageId}`, 'upscaled');
      const diffFolder = path.resolve(tmpDir, `${image.imageId}`, 'diff');
      const { srPath, srHeight, srWidth, lrPath } = image;
      await new Promise(r => setTimeout(r, delay));
      const upscaledBuffer = await this.upscale(model, path.resolve(cacheDir, lrPath));
      const upscaledPath = path.resolve(upscaledFolder, Image.makePath(lrPath, cropKey, `${model.scale}x`));
      mkdirpSync(path.dirname(upscaledPath));
      writeFileSync(upscaledPath, upscaledBuffer);
      const upscaledDimensions = await getSize(upscaledPath);

      const diffPath = path.resolve(diffFolder, Image.makePath(lrPath, cropKey, `${model.scale}x`));
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
          ImageId: image.imageId,
        });
      }));
    } else {
      console.log('.')
    }
  };

  async benchmark(cropSize?: number, n: number = Infinity, delay = 0) {
    const metrics = await Promise.all((await Metric.findAll()).map(async metric => {
      await metric.setId();
      return metric;
    }));

    const cropKey = Image.getCropKey(cropSize);

    const countsByDataset = new Map<string, number>();
    for (const { datasetName, files } of await sequelize.query<{
      datasetName: string;
      files: number;
    }>(`
      SELECT 
      COUNT(1) as files,
      d.name as datasetName
      FROM files f
      LEFT JOIN datasets d on f.DatasetId = d.id
      GROUP BY d.id
      ;
    `, {
      type: QueryTypes.SELECT,
    })) {
      countsByDataset.set(datasetName, files);
    }

    const evaluationPairs: { dataset: Dataset; model: UpscalerModel; }[] = [];
    let total = 0;
    for (const dataset of this.datasets) {
      const numberOfFiles = countsByDataset.get(dataset.name);
      if (numberOfFiles === undefined) {
        throw new Error(`Could not find number of files for dataset ${dataset.name}`);
      }
      for (const modelPackage of this.modelPackages) {
        const models = await modelPackage.models;
        for (const model of models) {
          total += numberOfFiles;
          evaluationPairs.push({
            dataset,
            model,
          });
        }
      }
    }

    const imagesByScale = new Map<number, Map<string, FileAndImage[]>>();
    for (const image of await sequelize.query<FileAndImage>(`
      SELECT 
      d.name as datasetName,
      i.scale,
      i.srPath,
      i.srHeight,
      i.srWidth,
      i.lrPath,
      i.id as imageId
      FROM images i
      LEFT JOIN files f ON f.id = i.FileId
      LEFT JOIN datasets d on f.DatasetId = d.id
      WHERE 1=1
      AND d.name IN(:datasetNames)
      AND cropSize = :cropKey
      ;
    `, {
      replacements: {
        cropKey,
        datasetNames: this.datasets.map(dataset => dataset.name),
      },
        // const lrPath = Image.getLrPath(file.path, model.scale, cropSize);
      type: QueryTypes.SELECT,
    })) {
      let imagesByDataset = imagesByScale.get(image.scale);
      if (!imagesByDataset) {
        imagesByDataset = new Map<string, FileAndImage[]>();
        imagesByScale.set(image.scale, imagesByDataset);
      }

      let images = imagesByDataset.get(image.datasetName);
      if (!images) {
        images = [];
        imagesByDataset.set(image.datasetName, images);
      }
      images.push(image);
    }

    await this.queryForExistingResults(
      metrics,
      evaluationPairs.map(({ model }) => {
        return model.id;
      }),
      cropSize,
    );

    const errors = new Map<Model, {
      err: unknown;
      file: FileAndImage;
    }[]>();

    const progressBar = new ProgressBar(total);
    let i = 0;

    for (const { model, dataset } of evaluationPairs) {
      const imagesForScale = imagesByScale.get(model.scale);
      if (!imagesForScale) {
        throw new Error(`No images found for scale ${model.scale}`);
      }
      const files = imagesForScale.get(dataset.name);
      if (!files) {
        throw new Error(`No images found for dataset ${dataset.name}`);
      }
      const arr: number[] = Array(Math.min(n, files.length)).fill('').map((_, i) => i);
      const progress = async (i: number) => {
        const file = files[i];
        if (!file) {
          console.log(files, i);
          throw new Error(`No file for index ${i}`);
        }
        if (!errors.get(model)) {
          try {
            return await this.benchmarkFile(dataset, model, file, metrics, cropSize, {
              delay,
            });
          } catch (err: unknown) {
            errors.set(model, (errors.get(model) || []).concat({
              err,
              file,
            }));
          }
        }
      }
      for await (const _ of asyncPool(1, arr, progress)) {
        i++;
        progressBar.update();
      }
    }
    progressBar.end();
    if (Object.values(errors).length) {
      console.error(`The following models (${Object.keys(errors).length}) had errors`);
      console.error(errors);
    }
    console.log('processed', total, 'files');
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

  async display(cropSize?: number, metricName?: string) {
    const packages = this.modelPackages;

    const getTableName = (datasetName: string, metricName: string) => [metricName, datasetName].join('_');
    const metrics = metricName === undefined ? ['psnr', 'ssim'] : [metricName];
    const pairs = this.datasets.reduce((arr, dataset) => {
      return arr.concat(metrics.map(metric => [dataset.name, metric]));
    }, [] as [string, string][]);
    const cropKey = Image.getCropKey(cropSize);

    const query = `
          SELECT 
          p.name as packageName,
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
                  AND cropSize = :cropKey
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
        cropKey,
        packageNames: packages.map(p => p.name),
      },
      type: QueryTypes.SELECT,
    });
    const table = new Table({
      head: ['Package', 'Model', 'Scale', ...pairs.map(([datasetName, metric]) => [datasetName, metric.toUpperCase()].join('-'))],
    });

    results.forEach(result => {
      table.push([result.packageName, result.modelName, result.scale, ...pairs.map(([datasetName, metric]) => {
        const tableName = getTableName(datasetName, metric);
        return result[tableName] || '---';
      })]);
    });

    console.log(table.toString());
  }
}

const getKeyForExistingResults = ({ MetricId, UpscalerModelId, ImageId }: ExistingResult) => [MetricId, UpscalerModelId, ImageId].join('-');
