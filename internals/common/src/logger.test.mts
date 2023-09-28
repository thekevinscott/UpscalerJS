import chalk from 'chalk';
import { vi } from 'vitest';
import { rimraf } from 'rimraf';
import { isLogLevel, log, parseMessage, setLogLevel, logTypes } from './logger.mjs';
import * as mockProcess from 'vitest-mock-process';

vi.mock('rimraf', async () => {
  const actual = await vi.importActual("rimraf") as typeof rimraf;
  return {
    ...actual,
    rimraf: vi.fn(),
  };
});

describe('logger', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isLogLevel', () => {
    it('returns true if a valid log level', () => {
      expect(isLogLevel('error')).toBe(true);
      expect(isLogLevel('warn')).toBe(true);
      expect(isLogLevel('info')).toBe(true);
      expect(isLogLevel('verbose')).toBe(true);
    });

    it('returns false if not a valid log level', () => {
      expect(isLogLevel('foo')).toBe(false);
    });
  });

  describe('parseMessage', () => {
    it('parses a string message', () => {
      expect(parseMessage('foo')).toEqual('foo');
    });

    it('parses an array of string messages', () => {
      expect(parseMessage('foo', 'bar', 'baz')).toEqual('foo bar baz');
    });

    it('parses out a boolean', () => {
      expect(parseMessage(true)).toEqual(chalk.yellow('true'));
      expect(parseMessage(false)).toEqual(chalk.yellow('false'));
    });

    it('parses out a number', () => {
      expect(parseMessage(123)).toEqual(chalk.yellow('123'));
    });

    it('parses out an object', () => {
      expect(parseMessage({ foo: 'bar' })).toEqual('{"foo":"bar"}');
    });

    it('parses out a combo of stuff', () => {
      expect(parseMessage({ foo: 'bar' }, 'baz', 123, true)).toEqual(`{"foo":"bar"} baz ${chalk.yellow(123)} ${chalk.yellow('true')}`);
    });
  });

  describe('log', () => {
    let mockStdout: ReturnType<typeof mockProcess.mockProcessStdout>;
    let mockStderr: ReturnType<typeof mockProcess.mockProcessStderr>;

    beforeEach(() => {
      mockStdout = mockProcess.mockProcessStdout();
      mockStderr = mockProcess.mockProcessStderr();
    });

    it('logs if level is greater than valid', () => {
      setLogLevel('info');
      log('warn', ['foo']);
      expect(mockStderr).toHaveBeenCalledWith(logTypes.warn('foo\n'));
    });

    it('logs if level is equal to valid', () => {
      setLogLevel('info');
      log('info', ['foo']);
      expect(mockStdout).toHaveBeenCalledWith(logTypes.info('foo\n'));
    });

    it('ignores log if below current log level', () => {
      setLogLevel('info');
      log('verbose', ['foo']);
      expect(mockStdout).toHaveBeenCalledTimes(0);
    });
  });
});
