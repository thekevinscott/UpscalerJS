import { buildUpscaler } from "./lib/utils/buildUpscaler";

const isValidPlatform = (platform: string): platform is 'browser' | 'node' => {
  return ['browser', 'node'].includes(platform);
}

const getPlatform = (args: Array<string> = []): 'browser' | 'node' => {
  const testPath = args.filter(arg => arg.startsWith('test/jestconfig.')).pop();

  const platform = testPath?.split('test/jestconfig.').pop().split('.').shift();

  if (isValidPlatform(platform)) {
    return platform;
  }

  throw new Error(`No valid platform found. Was looking for "browser" or "node", but found: ${platform}. Full test path provided was: ${testPath}.`);
}

export default async () => {
  const start = new Date().getTime();
  const platform = getPlatform(process.argv);
  console.log(`\n***** Building upscaler for ${platform} *****\n`);
  await buildUpscaler(platform);
  const now = new Date().getTime();
  const elapsed = now - start;
  console.log(`\n***** Upscaler built successfully in ${elapsed}ms *****\n`);
};
