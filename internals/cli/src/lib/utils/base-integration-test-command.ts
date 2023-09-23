import {Interfaces, Args, Flags} from '@oclif/core';
import { BaseCommand } from './base-command.js';

export type Flags<T extends typeof BaseIntegrationTestCommand> = Interfaces.InferredFlags<typeof BaseIntegrationTestCommand['baseFlags'] & T['flags']>
export type Args<T extends typeof BaseIntegrationTestCommand> = Interfaces.InferredArgs<T['args']>

export abstract class BaseIntegrationTestCommand<T extends typeof BaseIntegrationTestCommand> extends BaseCommand<T> {
  // define flags that can be inherited by any command that extends BaseCommand
  static baseFlags = {
    ...BaseCommand.baseFlags,
    skipUpscalerBuild: Flags.boolean({ char: 'u', description: 'Skip the UpscalerJS build', default: false }),
    skipModelBuild: Flags.boolean({ char: 'm', description: 'Skip the model builds', default: false }),
    skipBundle: Flags.boolean({ char: 'b', description: 'Skip the bundling step', default: false }),
    skipTest: Flags.boolean({ char: 't', description: 'Skip the actual tests (for example, if performing the other scaffolding steps)', default: false }),
    useGPU: Flags.boolean({ char: 'g', description: 'Whether to run tests on the GPU', default: false }),
    useTunnel: Flags.boolean({ char: 'n', description: 'Whether to expose servers over a tunnel and make them available over the internet' }),
    shouldClearDistFolder: Flags.boolean({ char: 'd', description: 'Whether to clear model dist folders or not, effectively, forcing a rebuild', default: false }),
    watch: Flags.boolean({ char: 'w', description: 'Watch mode', default: false }),
  }

  static strict = false;

  static args = {
    files: Args.string({description: 'Optional files to supply'}),
  }

  public async init(): Promise<void> {
    await super.init()
    const {args, flags} = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseIntegrationTestCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
    })
    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;
  }

  // protected async catch(err: Error & {exitCode?: number}): Promise<any> {
  //   // add any custom logic to handle errors from the command
  //   // or simply return the parent class error handling
  //   return super.catch(err)
  // }

  // protected async finally(_: Error | undefined): Promise<any> {
  //   // called after run and catch regardless of whether or not the command errored
  //   return super.finally(_)
  // }
}
