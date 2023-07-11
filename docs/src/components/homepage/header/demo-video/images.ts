import { IExampleImage } from "./example-images/example-images";

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
      long: 'Upscaled using [`@upscalerjs/esrgan-thick` 4x](/models/available/esrgan-thick) model',
    },
  },
});

const images: Record<string, IExampleImage> = {
  esrganFlower: makeESRGAN('flower'),
  esrganFace3: makeESRGAN('face3'),
  esrganFace2: makeESRGAN('face2'),
  esrganFace1: makeESRGAN('face1'),
}

export const IMAGES: IExampleImage[] = [
  images.esrganFlower,
  images.esrganFace2,
  images.esrganFace3,
  images.esrganFace1,
].filter(Boolean);
