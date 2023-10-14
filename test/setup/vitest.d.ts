import type { Page } from 'puppeteer';
import type { Assertion, AsymmetricMatchersContaining } from 'vitest'
import type { MemoryFn } from './matchers/toHaveLeakedMemory/index.ts';

interface CustomMatchers<R = unknown, A = unknown> {
  toMatchImage(imagePath: string): R;
  toHaveLeakedMemory(ending: Memory, i?: number): R;
  toHaveBeenCalledWithURL(name: string | RegExp): R;
  toBeWithin(args: [number, number, number]): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
