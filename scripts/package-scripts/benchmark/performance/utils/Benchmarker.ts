import { Database } from "./Database";
import os from 'os';
import path from 'path';
import { DatasetDefinition } from "./types";
import { mkdirp, mkdirpSync, writeFileSync } from "fs-extra";
import { TF } from "./types";
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
import { ProgressBar } from "../../../utils/ProgressBar";

export interface BenchmarkedResult {
  packageName: string;
  modelName: string;
  scale: number;
  meta: Record<string, string | number>;
  values: Record<string, Record<string, number>>;
}

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

  constructor(cacheDir: string, metrics: string[]) {
    this.database = new Database(metrics);
    this.cacheDir = cacheDir;
  }

  async addDatasets(datasets: DatasetDefinition[], cropSize?: number, resultsOnly?: boolean, n = Infinity) {
    for (const datasetDefinition of datasets) {
      const cacheDir = path.resolve(this.cacheDir, datasetDefinition.datasetName);
      await mkdirp(cacheDir);
      const writeFiles = resultsOnly !== true;
      const dataset = await this.database.addDataset(cacheDir, datasetDefinition, writeFiles, cropSize, n);
      this.datasets.push(dataset);
    }
  }

  async addModels(tf: TF, modelPackageNames: string[], resultsOnly?: boolean, useGPU = false, models?: string[]) {
    for (const packageName of modelPackageNames) {
      console.log(`Model ${packageName}`);
      const modelPackage = await this.database.addModelPackage(tf, packageName, resultsOnly, useGPU, models);
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

  async benchmarkFile(dataset: Dataset, model: UpscalerModel, image: FileAndImage, metrics: Metric[], {
    delay,
    cropSize,
    upscaledFolder,
    tf,
  }: {
    delay: number; 
    cropSize: undefined | number;
    upscaledFolder: string;
    tf: TF;
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
      const diffFolder = path.resolve(os.tmpdir(), 'upscalerjs/diff');
      const { srPath, srHeight, srWidth, lrPath } = image;
      await new Promise(r => setTimeout(r, delay));
      const upscaledPath = path.resolve(upscaledFolder, Image.makePath(lrPath, cropKey, `${model.scale}x`));
      mkdirpSync(path.dirname(upscaledPath));
      // if (!existsSync(upscaledPath)) {
        const upscaledBuffer = await this.upscale(tf, model, path.resolve(cacheDir, lrPath));
        writeFileSync(upscaledPath, upscaledBuffer);
      // }
      const upscaledDimensions = await getSize(upscaledPath);

      const diffPath = path.resolve(diffFolder, Image.makePath(lrPath, cropKey, `${model.scale}x`));
      mkdirpSync(path.dirname(diffPath));

      if (srWidth !== upscaledDimensions.width || srHeight !== upscaledDimensions.height) {
        throw new Error(`Dimensions mismatch. Original image: ${JSON.stringify({ originalWidth: srWidth, originalHeight: srHeight })}, Upscaled image: ${JSON.stringify(upscaledDimensions)}`)
      }
      await Promise.all(metrics.map(async metric => {
        const value = await this.calculatePerformance(upscaledPath, path.resolve(cacheDir, srPath), diffPath, metric.name);
        if (Number.isNaN(value)) {
          throw new Error(`Metric calculation is NAN for paths ${upscaledPath}, ${srPath} and metric ${metric.name}`);
        }
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

  async benchmark(tf: TF, packageNames: string[], cropSize?: number, n: number = Infinity, modelNames?: string[], delay = 0) {
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
        if (packageNames.includes(modelPackage.name)) {
          const models = await modelPackage.getModels(modelNames);
          for (const model of models) {
            total += Math.min(n, numberOfFiles);
            evaluationPairs.push({
              dataset,
              model,
            });
          }
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
    const rootUpscaledFolder = path.resolve(this.cacheDir, 'upscaled');

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
          throw new Error(`No file for index ${i}, ${JSON.stringify(files)}`);
        }
        if (!errors.get(model)) {
          try {
            const upscaledFolder = path.resolve(rootUpscaledFolder, model.name, `${file.imageId}`);
            return await this.benchmarkFile(dataset, model, file, metrics, {
              delay,
              cropSize,
              upscaledFolder,
              tf,
            });
          } catch (err: unknown) {
            const existingErrors = errors.get(model) || [] as { err: unknown; file: FileAndImage }[];
            errors.set(model, existingErrors.concat({
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
    errors.forEach((values, model) => {
      console.log((model as UpscalerModel).name);
      console.log(values.map(({ err }) => err));
    });
    console.log('processed', total, 'files');
  }

  private async upscale(tf: TF, model: UpscalerModel, downscaled: string, progress?: (rate: number) => void): Promise<Buffer> {
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
    try {
      const cmd = `compare -metric ${metric} ${upscaledPath} ${originalPath} ${diffPath}`;
      const [_, out,] = await runScript(cmd);
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

  async retrieveResults(metrics: string[], cropSize?: number, modelNames?: string[]): Promise<BenchmarkedResult[]> {
    const packages = this.modelPackages;

    const tableDivider = '___';
    const getTableName = (datasetName: string, metricName: string) => [metricName, datasetName].join(tableDivider);
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

          WHERE 1=1
          AND p.name IN(:packageNames)
          ${modelNames ? `AND um.name IN (:modelNames)` : ''}
                    
          GROUP BY r.UpscalerModelId;
      `;
    let queryModelNames: string[] = [];
    for (const pkg of packages) {
      const models = await pkg.getModels(modelNames);
      queryModelNames = queryModelNames.concat(models.map(m => m.name));
    }
    const results: Record<string, string | number>[] = await sequelize.query(query, {
      replacements: {
        cropKey,
        packageNames: packages.map(p => p.name),
        modelNames: queryModelNames,
      },
      type: QueryTypes.SELECT,
    });

    return results.map(({
      packageName,
      modelName,
      scale,
      meta,
      ...resultRecords
    }) => {
      const values = pairs.reduce((obj, [datasetName, metricName]) => {
        const tableName = getTableName(datasetName, metricName);
        const value = resultRecords[tableName] as number;
        return {
          ...obj,
          [datasetName]: {
            ...(obj[datasetName] || {}),
            [metricName]: value,
          }
        };
      }, {} as Record<string, Record<string, number>>);

      const result: BenchmarkedResult = {
        packageName: `${packageName}`,
        modelName: `${modelName}`,
        scale: parseInt(`${scale}`, 10),
        meta: JSON.parse(`${meta}`),
        values,
      };

      return result;
    });
  }
}

const getKeyForExistingResults = ({ MetricId, UpscalerModelId, ImageId }: ExistingResult) => [MetricId, UpscalerModelId, ImageId].join('-');
