import path from 'path';
import { runServer } from 'verdaccio';
import { withTmpDir } from '@internals/common/tmp-dir';
import { ROOT_DIR, TMP_DIR } from '@internals/common/constants';
import { Server } from 'http';
import { error, info } from '@internals/common/logger';
import { removePackages } from './remove-packages.js';
import { publishPackage } from './publish-package.js';
import { getRegistryConfig } from './get-config.js';
import { writeFile } from '@internals/common/fs'
import { getServerPort } from '../../http-server/src/index.js';
import { exists, readFile, mkdirp } from '@internals/common/fs';
import { execFile } from 'child_process';

import fetch from 'node-fetch';

const runCommand = (parts: string[]) => {
  return new Promise((resolve, reject) => {
    execFile(parts[0], parts.slice(1), (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        if (stderr) {
          error(stderr);
        }
        resolve(stdout);
      }
    });
  });
};

// These credentials are used to fill in htpasswd, but _not_ to log in.
// We create a _different_ user for verdaccio.
// Why? Who tf knows. Maybe the presence of an htpasswd allows verdaccio to create users.
const USERNAME = 'dummy-htpasswd-user';
const PASSWORD = 'dummy-htpasswd-password';

// const login = (registryURL: string) => new Promise<void>((resolve, reject) => {
const login = async (registryURL: string) => {
  const name = 'upscaler-user';
  const password = 'dummy-password';
  const json = await (await fetch(`${registryURL}/-/user/org.couchdb.user:${name}`, {
    method: 'PUT',
    body: JSON.stringify({ name, password }),
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    }
  })).json();
  if (Boolean(json) && json !== null && typeof json === 'object' && 'token' in json && typeof json.token === 'string') {
    return json.token;
  }
  throw new Error(`Bad response from registry: ${JSON.stringify(json)}`);
};

const makeHtpasswdFile = async (htpasswdPath: string) => {
  await mkdirp(path.dirname(htpasswdPath));
  await runCommand([
    'htpasswd',
    '-cb',
    htpasswdPath,
    USERNAME,
    PASSWORD,
  ]);
};

const startRegistryServer = (app: Server, port: number) => new Promise<void>((resolve, reject) => {
  app.listen(port, resolve).on('error', reject);
});

const getStorageDir = (outDir: string) => path.resolve(outDir, 'storage');

const startRegistry = (outDir: string, htpasswd: string, port: number) => withTmpDir(async (tmpDir) => {
  const configPath = path.resolve(tmpDir, 'config.yaml');
  const config = getRegistryConfig(getStorageDir(outDir), htpasswd);
  await writeFile(configPath, config);
  const app: Server = await runServer(configPath);
  await startRegistryServer(app, port);
  return app;
}, {
  rootDir: path.resolve(ROOT_DIR, 'configs'),
});

const updateNPMRCWithRegistry = async (outDir: string, registryURL: string, token: string) => {
  const npmrcPath = path.resolve(outDir, '.npmrc');
  const contents = new Map();
  const npmrcContents = await exists(npmrcPath) ? await readFile(npmrcPath) : '';
  for (const line of npmrcContents.split('\n').filter(Boolean)) {
    contents.set(line.split('=')[0], line);
  }
  contents.set(`//${registryURL}/:_authToken=`, `//${registryURL}/:_authToken="${token}"`)

  await writeFile(npmrcPath, Array.from(contents.values()).join('\n'));
  return npmrcPath;
}

const getHttpaswdPath = (outDir: string) => path.resolve(outDir, 'htpasswd');
const getNpmrcPath = (outDir: string) => path.resolve(outDir, '.npmrc');

export interface Package {
  name: string;
  directory: string;
}

export class Registry {
  private _app?: Server;
  public port = 0;
  private listeners = 0;
  chosenPort: Promise<number>;
  outDirRoot: string = path.resolve(TMP_DIR, 'registry');
  outDir?: string;
  packages: Promise<Package[]> = Promise.resolve([]);
  npmrcDir?: string;

  constructor(packages: Promise<Package[]>) {
    this.packages = packages;
    // this.chosenPort = getPort();
    this.chosenPort = Promise.resolve(4173);
    this.chosenPort.then(port => {
      this.outDir = path.resolve(this.outDirRoot, port.toString());
    });
  }

  get url() {
    if (!this._app) {
      throw new Error('Registry has not been started yet')
    }

    return `http://localhost:${getServerPort(this._app)}`;
  }

  start = async () => {
    this.listeners += 1;
    if (!this._app) {
      const start = performance.now();
      const port = await this.chosenPort;
      if (!this.outDir) {
        throw new Error('No outDir was set');
      }
      info('Starting registry...');
      const htpasswd = getHttpaswdPath(this.outDir);
      await makeHtpasswdFile(htpasswd);
      this._app = await startRegistry(this.outDir, htpasswd, port);
      const token = await login(this.url)
      this.port = getServerPort(this._app);
      info(`Started registry in ${Math.round(performance.now() - start) / 1000 } s at: ${this.url}`);

      // need to update the .npmrc at the root, because pnpm does not support specifying a custom .npmrc file
      // https://github.com/pnpm/pnpm/issues/6036
      await updateNPMRCWithRegistry(ROOT_DIR, this.url, token);
    }
  }

  resetPackages = async () => {
    const packages = await this.packages;
    if (packages.length === 0) {
      throw new Error('No packages were found to reset.')
    }
    info(`Resetting ${packages.length} packages...`);
    if (!this.outDir) {
      throw new Error('No outDir was set');
    }
    await removePackages(getStorageDir(this.outDir), packages.map(({ name }) => name));
  }

  bootstrapPackages = async () => {
    const start = performance.now();
    const packages = await this.packages;
    info(`Bootstrapping ${packages.length} packages...`);
    for (const { name: packageName, directory: packageDir } of packages) {
      try {
        await publishPackage(
          packageName, 
          packageDir, 
          this.url, 
          getNpmrcPath(ROOT_DIR),
        );
      } catch(err) {
        error(`There was an error publishing package ${packageName}. Try rerunning with -l verbose to see more information.`);
        throw err;
      }
    }
    // await Promise.all(packages.map(async ({
    //   name: packageName,
    //   directory: packageDir,
    // }) => {
    //   try {
    //     await publishPackage(packageName, packageDir, this.url);
    //   } catch(err) {
    //     console.error(`There was an error publishing package ${packageName}`);
    //     throw err;
    //   }
    // }));
    info(`Bootstrapped ${packages.length} packages in ${Math.round(performance.now() - start) / 1000 } s`);
  }

  stop = async () => {
    this.listeners -= 1;
    if (this.listeners < 0) {
      throw new Error('Listeners has been decremented below 0, which indicates an excess of close calls.');
    }
    if (this.listeners === 0) {
      // if (!this.htpasswdDir) {
      //   throw new Error('No htpasswdDir was set');
      // }
      // if (!this.npmrcDir) {
      //   throw new Error('No npmrcDir was set');
      // }
      const app = this._app;
      if (!app) {
        throw new Error('All listeners have ben closed but app does not exist');
      }
      await Promise.all([
        app.close(),
        // rimraf(getHttpaswdPath(this.outDir)),
        // rimraf(this.npmrcDir),
      ])
      this._app = undefined;
    }
  }

  get running() {
    return this._app !== undefined;
  }
}
