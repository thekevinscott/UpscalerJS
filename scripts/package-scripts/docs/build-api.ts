import path from 'path';
import { Application, TSConfigReader, TypeDocReader } from 'typedoc';
import { UPSCALER_DIR } from '../utils/constants';

/****
 * Main function
 */
async function main() {
  const app = new Application();

  app.options.addReader(new TSConfigReader())
  app.options.addReader(new TypeDocReader())

  app.bootstrap({
    // typedoc options here
    entryPoints: [path.resolve(UPSCALER_DIR, 'src')],
    tsconfig: path.resolve(UPSCALER_DIR, 'tsconfig.json'),
  });

  const project = app.convert();

  if (project) {
    const ser = app.serializer.projectToObject(project)
    console.log(ser);
  } else {
    throw new Error('No project was converted.')
  }
}

/****
 * Functions to expose the main function as a CLI tool
 */

if (require.main === module) {
  (async () => {

    await main();
  })();
}
