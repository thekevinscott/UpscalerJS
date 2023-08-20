import { vi } from 'vitest';
import { spawn } from 'child_process';
import { runNPMCommand } from "./run-npm-command";

vi.mock('child_process', () => {
  return {
    spawn: vi.fn(),
  }
});

describe('run-npm-command', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('if the command throws an error, it should reject', async () => {
    const error = 'huzzah';
    vi.mocked(spawn).mockImplementation(() => ({
      on: (event: string, callback: (...args: unknown[]) => unknown) => {
        if (event === 'error') {
          callback(error);
        }
      },
    }));
    await expect(() => runNPMCommand([], 'foo')).rejects.toThrow(error);
  });

  it('if the command exits with a non-0 exit code, it should reject with that code', async () => {
    const code = 1;
    vi.mocked(spawn).mockImplementation(() => ({
      on: (event: string, callback: (...args: unknown[]) => unknown) => {
        if (event === 'close') {
          callback(`${code}`);
        }
      },
    }));
    await expect(() => runNPMCommand([], 'foo')).rejects.toThrow(`${code}`);
  });

  it('if the command exits with a 0 exit code, it should resolve', async () => {
    vi.mocked(spawn).mockImplementation(() => ({
      on: (event: string, callback: (...args: unknown[]) => unknown) => {
        if (event === 'close') {
          callback(0);
        }
      },
    }));
    await runNPMCommand([], 'foo');
  });
});
