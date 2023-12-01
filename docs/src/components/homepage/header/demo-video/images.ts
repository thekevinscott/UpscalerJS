import { IExampleImage } from "./example-images/example-images";

const makeMAXIM = (model: string, action: string): IExampleImage => ({
  sizes: {
    original: 256,
    enhanced: 256,
  },
  original: {
    src: `/assets/homepage-demo/originals/${model}.png`,
    labels: {
      short: 'Original',
      long: 'Original',
    },
  },
  enhanced: {
    src: `/assets/homepage-demo/enhanced/${model}.png`,
    labels: {
      short: `@upscalerjs/maxim-${model}`,
      long: `${action} using [\`@upscalerjs/maxim-${model}\`](/models/available/maxim-${model}) model`,
    },
  },
});

const makeESRGAN = (image: string): IExampleImage => ({
  sizes: {
    original: 128,
    enhanced: 256,
  },
  original: {
    src: `/assets/homepage-demo/originals/${image}.png`,
    labels: {
      short: 'Bicubic interpolation',
      long: 'Upscaled using native bicubic interpolation',
    },
  },
  enhanced: {
    src: `/assets/homepage-demo/enhanced/${image}.png`,
    labels: {
      short: '@upscalerjs/esrgan-thick/4x',
      long: 'Upscaled using [`@upscalerjs/esrgan-thick` 4x](/models/available/upscaling/esrgan-thick) model',
    },
  },
});

const images: Record<string, IExampleImage> = {
  maximDenoising: makeMAXIM('denoising', 'Denoised'),
  maximEnhancement: makeMAXIM('enhancement', 'Enhanced'),
  maximDeblurring: makeMAXIM('deblurring', 'Deblurred'),
  esrganFlower: makeESRGAN('flower'),
  esrganFace3: makeESRGAN('face3'),
  esrganFace2: makeESRGAN('face2'),
  esrganFace1: makeESRGAN('face1'),
}

export const IMAGES: IExampleImage[] = [
  images.esrganFlower,
  images.esrganFace2,
  images.maximEnhancement,
  images.esrganFace3,
  images.maximDeblurring,
  images.esrganFace1,
  images.maximDenoising,
].filter(Boolean);
