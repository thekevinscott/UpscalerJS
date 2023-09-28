import chalk, { ChalkInstance } from 'chalk';

export type LogLevel = 'info' | 'warn' | 'error' | 'verbose';

export const logLevels = [
  'error',
  'warn',
  'info',
  'verbose',
];

export const isLogLevel = (logType: unknown): logType is LogLevel => typeof logType === 'string' && ['error', 'warn', 'info', 'verbose'].includes(logType);

export const DEFAULT_LOG_LEVEL: LogLevel = isLogLevel(process.env.logLevel) ? process.env.logLevel : 'info';

const level: { level: LogLevel } = {
  level: DEFAULT_LOG_LEVEL,
}

export const logTypes: Record<LogLevel, ChalkInstance> = {
  error: chalk.bold.red,
  warn: chalk.hex('#FFA500'), // Orange color
  info: chalk.bold.blue,
  verbose: chalk.green,
};

export const parseMessage = (...message: unknown[]): string => message.map(m => {
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

const getConsoleLogger = (type: LogLevel) => type === 'error' || type === 'warn' ? console.error : console.log;

export const log = (type: LogLevel, message: unknown[]) => {
  if (logLevels.indexOf(type) <= logLevels.indexOf(level.level)) {
    const chalkType = logTypes[type];
    const parsedMessage = chalkType(`${parseMessage(...message)}`);
    getConsoleLogger(type)(parsedMessage);
  }
};

export const setLogLevel = (newLevel: LogLevel) => {
  if (!isLogLevel(newLevel)) {
    throw new Error(`Invalid log type provided: ${newLevel}`);
  }
  level.level = newLevel;
};

export const getLogLevel = () => level.level;

export const info = (...message: unknown[]) => log('info', message);
export const warn = (...message: unknown[]) => log('warn', message);
export const error = (...message: unknown[]) => log('error', message);
export const verbose = (...message: unknown[]) => log('verbose', message);

export const output = (...message: unknown[]) => console.log(chalk.cyan(...message));
