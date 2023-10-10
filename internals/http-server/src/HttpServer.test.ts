import { vi, } from 'vitest';
import { Server as HTTPServer } from 'http';
import { ERROR_STRING_ADDRESS, ERROR_NO_ADDRESS, getServerPort } from "./HttpServer.js";

describe('getServerPort', () => {
  it('throws if no address is returned', () => {
    const address = vi.fn().mockImplementation(() => undefined);
    expect(() => getServerPort({
      address,
    } as unknown as HTTPServer)).toThrowError(ERROR_NO_ADDRESS);
  });

  it('throws if string address is returned', () => {
    const address = vi.fn().mockImplementation(() => 'foo');
    expect(() => getServerPort({
      address,
    } as unknown as HTTPServer)).toThrowError(ERROR_STRING_ADDRESS);
  });

  it('returns valid port', () => {
    const port = 123;
    const address = vi.fn().mockImplementation(() => ({
      port,
    }));
    expect(getServerPort({
      address,
    } as unknown as HTTPServer)).toEqual(port);
  });
});
