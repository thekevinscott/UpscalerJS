import { ConfigBuilder } from 'verdaccio';
import { dump } from 'js-yaml';

const access = '$all';

export const getRegistryConfig = (storageDir: string, htpasswd: string) => {
  const config = ConfigBuilder
    .build()
    .addStorage(storageDir)
    .addUplink('npmjs', { url: 'https://registry.npmjs.org/' })
    .addPackageAccess('upscaler', {
      access,
      publish: access,
    })
    .addPackageAccess('@upscalerjs/*', {
      access,
      publish: access,
    })
    .addPackageAccess('**', {
      access,
      publish: access,
      proxy: 'npmjs',
    })
    .getConfig();

  const dumped = dump({
    ...config,
    max_body_size: '1000mb',
    // log: "{ type: 'file', path: '.tmp/log.txt', level: 'fatal' }"
    auth: {
      htpasswd: {
        file: htpasswd,
      }
    }
  });
  // console.log(dumped);
  return dumped;
};
