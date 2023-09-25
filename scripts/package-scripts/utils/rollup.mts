import fs from 'fs';
import path from 'path';
import { OutputOptions, rollup, RollupBuild, RollupOptions } from 'rollup';

export async function rollupBuild(inputOptions: RollupOptions, outputOptionsList: Array<OutputOptions>, dist: string) {
  let bundle: RollupBuild | undefined = undefined;
  let buildFailed = false;
  try {
    // create a bundle
    bundle = await rollup({
      ...inputOptions,
      onwarn: (warning) => {
        if (warning.code === 'MIXED_EXPORTS') {
          throw new Error(warning.message);
        } else {
          console.warn(warning);
          throw new Error(warning.message);
        }
      }
    });

    // // an array of file names this bundle depends on
    // console.log(bundle.watchFiles);

    await generateOutputs(bundle, outputOptionsList, dist);
  } catch (error) {
    buildFailed = true;
    // do some error reporting
    console.error(error);
  }
  if (bundle) {
    // closes the bundle
    await bundle.close();
  }
  if (buildFailed) {
    throw new Error('build failed');
  }
}

async function generateOutputs(bundle: RollupBuild, outputOptionsList: Array<OutputOptions>, dist: string) {
  for (const outputOptions of outputOptionsList) {
    // generate output specific code in-memory
    // you can call this function multiple times on the same bundle object
    // replace bundle.generate with bundle.write to directly write to disk
    const { output } = await bundle.generate(outputOptions);

    for (const chunkOrAsset of output) {
      // console.log('chunk or asset', chunkOrAsset)
      if (chunkOrAsset.type === 'asset') {
        // For assets, this contains
        // {
        //   fileName: string,              // the asset file name
        //   source: string | Uint8Array    // the asset source
        //   type: 'asset'                  // signifies that this is an asset
        // }
        // fs.writeFileSync(fileN)
        console.log('Asset', chunkOrAsset);
      } else {
        // For chunks, this contains
        // {
        //   code: string,                  // the generated JS code
        //   dynamicImports: string[],      // external modules imported dynamically by the chunk
        //   exports: string[],             // exported variable names
        //   facadeModuleId: string | null, // the id of a module that this chunk corresponds to
        //   fileName: string,              // the chunk file name
        //   implicitlyLoadedBefore: string[]; // entries that should only be loaded after this chunk
        //   imports: string[],             // external modules imported statically by the chunk
        //   importedBindings: {[imported: string]: string[]} // imported bindings per dependency
        //   isDynamicEntry: boolean,       // is this chunk a dynamic entry point
        //   isEntry: boolean,              // is this chunk a static entry point
        //   isImplicitEntry: boolean,      // should this chunk only be loaded after other chunks
        //   map: string | null,            // sourcemaps if present
        //   modules: {                     // information about the modules in this chunk
        //     [id: string]: {
        //       renderedExports: string[]; // exported variable names that were included
        //       removedExports: string[];  // exported variable names that were removed
        //       renderedLength: number;    // the length of the remaining code in this module
        //       originalLength: number;    // the original length of the code in this module
        //       code: string | null;       // remaining code in this module
        //     };
        //   },
        //   name: string                   // the name of this chunk as used in naming patterns
        //   referencedFiles: string[]      // files referenced via import.meta.ROLLUP_FILE_URL_<id>
        //   type: 'chunk',                 // signifies that this is a chunk
        // }
        // console.log(chunkOrAsset.fileName)
        // console.log(chunkOrAsset.code)
        fs.writeFileSync(path.resolve(dist, chunkOrAsset.fileName), chunkOrAsset.code, 'utf-8');
        // console.log('Chunk', chunkOrAsset.modules);
      }
    }
  }
}
