import { Command } from '@commander-js/extra-typings';

export default (program: Command) => program
    .command('integration')
    .description('Commands related to integration testing');

export const postProcess = (program: Command) => program
  .option('-u, --skip-upscaler-build', 'Skip the UpscalerJS build', false)
  .option('-m, --skip-model-build', 'Skip the model builds', false)
  .option('-b, --skip-bundle', 'Skip the bundling step', false)
  .option('-t, --skip-test', 'Skip the actual tests (for example, if performing the other scaffolding steps)', false)
  .option('-g, --use-gpu', 'Whether to run tests on the GPU', false)
  .option('-n, --use-tunnel', 'Whether to expose servers over a tunnel and make them available over the internet', false)
  .option('-d, --should-clear-dist-folder', 'Whether to clear model dist folders or not, effectively, forcing a rebuild', false)
  .option('-w, --watch', 'Watch mode', false);
