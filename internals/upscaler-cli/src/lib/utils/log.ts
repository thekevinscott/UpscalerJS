import chalk, { ChalkInstance } from 'chalk';

export type LogType = 'info' | 'warn' | 'error' | 'verbose';

const logs = [
  'error',
  'warn',
  'info',
  'verbose',
];

export const DEFAULT_LOG_LEVEL: LogType = 'info';

const isLogType = (logType: unknown): logType is LogType => typeof logType === 'string' && ['error', 'warn', 'info', 'verbose'].includes(logType);

const types: Record<LogType, ChalkInstance> = {
  error: chalk.bold.red,
  warn: chalk.hex('#FFA500'), // Orange color
  info: chalk.bold.blue,
  verbose: chalk.green,
};

const parseMessage = (...message: unknown[]): string => message.map(m => {
  if (Array.isArray(m)) {
    return parseMessage(...m);
  }
  if (typeof m === 'object' && m !== null) {
    return JSON.stringify(m);
  }
  if (m === true || m === false || typeof m === 'number') {
    return chalk.yellow(m.toString());
  }
  return m;
}).filter(Boolean).join(' ');

export const log = (type: LogType, ...message: unknown[]) => {
  if (logs.indexOf(type) <= logs.indexOf(level.level)) {
    const chalkType = types[type];
    if (type === 'error' || type === 'warn') {
      process.stderr.write(chalkType(`${parseMessage(...message)}\n`));
    } else {
      process.stdout.write(chalkType(`${parseMessage(...message)}\n`));
    }
  }
};

const level: { level: LogType } = {
  level: DEFAULT_LOG_LEVEL,
}
export const setLogLevel = (newLevel: LogType) => {
  if (!isLogType(newLevel)) {
    throw new Error(`Invalid log type provided: ${newLevel}`);
  }
  level.level = newLevel;
};

export const info = (...message: unknown[]) => log('info', ...message);
export const warn = (...message: unknown[]) => log('warn', ...message);
export const error = (...message: unknown[]) => log('error', ...message);
export const verbose = (...message: unknown[]) => log('verbose', ...message);
