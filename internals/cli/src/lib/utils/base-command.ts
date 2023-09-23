import { LogLevel, logLevels, setLogLevel } from '@internals/common/logger';
import {Interfaces, Args, Command, Flags} from '@oclif/core';

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<typeof BaseCommand['baseFlags'] & T['flags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class BaseCommand<T extends typeof Command> extends Command {
  static baseFlags = {
    'log-level': Flags.custom<LogLevel>({
      char: 'l',
      summary: 'Specify level for logging.',
      options: logLevels,
      helpGroup: 'GLOBAL',
    })(),
  }

  protected flags!: Flags<T>;
  protected args!: Args<T>;

  public async init(): Promise<void> {
    await super.init()
    const {args, flags} = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
    })
    this.flags = flags as Flags<T>
    this.args = args as Args<T>

    const logLevel = this.flags['log-level'];
    if (logLevel !== undefined) {
      setLogLevel(logLevel);
    }
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
