import { ReflectionKind } from "typedoc";
import { getSortedMethodsForWriting } from "./get-sorted-methods-for-writing.js";
import { DecRef, Definitions } from "./types.js";

describe('getSortedMethodsForWriting()', () => {
  it('ignores a non-default class', () => {
    const Class = {
      name: 'class',
      kind: ReflectionKind.Class,
      children: [],
    } as unknown as DecRef;
    const definitions = {
      classes: {
        Class,
      },
    } as unknown as Definitions;
    expect(getSortedMethodsForWriting(definitions)).toEqual([ ])
  });

  it('sorts children by line number', () => {
    const srcLine1 = {
      name: 'upscale',
      sources: {
        line: 1,
      }
    };
    const srcLine0 = {
      name: 'constructor',
      sources: {
        line: 0,
      }
    };
    const Class = {
      name: 'default',
      kind: ReflectionKind.Class,
      children: [srcLine1, srcLine0],
    } as unknown as DecRef;
    const definitions = {
      classes: {
        Class,
      },
    } as unknown as Definitions;
    expect(getSortedMethodsForWriting(definitions)).toEqual([
      srcLine1,
      srcLine0, 
    ])
  });
});
