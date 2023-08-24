import type { JSHandle, Page } from 'puppeteer';

export const EXPECTED_LAYER_MODELS = 2; // I don't know why, but we start with layer model references in memory.
export const EXPECTED_UPSCALERS = 0;

// https://puppeteer.github.io/puppeteer/docs/10.0.0/puppeteer.page.queryobjects/#example
const countObjects = async (page: Page, prototype: JSHandle): Promise<number> => {
  const instances = await page.queryObjects(prototype);
  const numberOfObjects = await page.evaluate((i) => i.length, instances);

  await prototype.dispose();
  await instances.dispose();

  return numberOfObjects;
};

export const tick = async (
  page: Page,
  tickTime = 10,
) => page.evaluate(async (duration) => new Promise(resolve => setTimeout(resolve, duration)), tickTime);

interface PrototypeDefinition {
  name: 'LayersModel' | 'Upscaler';
  prototype: (page: Page) => Promise<JSHandle>
}
interface TFJSMemory {
  unreliable: boolean;
  numBytesInGPU?: number;
  numBytesInGPUAllocated?: number;
  numBytesInGPUFree?: number;

  numBytes: number;
  numTensors: number;
  numDataBuffers: number;
  reasons?: string[];
}
export interface MemoryRecord {
  LayersModel: number;
  Upscaler: number;
  memory: TFJSMemory;
}
export const isMemoryRecord = (memoryRecord: unknown): memoryRecord is MemoryRecord =>
  memoryRecord !== null
  && typeof memoryRecord === 'object'
  && 'LayersModel' in memoryRecord
  && 'Upscaler' in memoryRecord
  && 'memory' in memoryRecord;

export const prototypes: Array<PrototypeDefinition> = [
  {
    prototype: page => page.evaluateHandle(() => window['Upscaler'].prototype),
    name: 'Upscaler',
  },
  {
    prototype: page => page.evaluateHandle(() => window['tf'].LayersModel.prototype),
    name: 'LayersModel',
  },
];

export const getAllObjects = (
  page: Page
) => Promise.all(prototypes.map(async ({
  prototype,
}) => countObjects(page, await prototype(page))));

export const getMemory = async (page: Page): Promise<MemoryRecord> => {
  const allObjects = await getAllObjects(page);

  const names = prototypes.map(p => p.name);

  // TODO: Type mismatch between TFJS exported types
  const tfMemory: TFJSMemory = await page.evaluate(() => window['tf'].memory() as TFJSMemory);

  return allObjects.reduce((obj, objects, i) => ({
    ...obj,
    [names[i]]: objects,
  }), {
    memory: tfMemory,
    LayersModel: 0,
    Upscaler: 0,
  });
};
