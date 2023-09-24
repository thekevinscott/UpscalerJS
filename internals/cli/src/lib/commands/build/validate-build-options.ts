import { isOutputFormat, isEnvironment, isTFJSLibrary } from "@internals/common/types";

function generalValidate<T>({
  elementType,
  isValidT,
}: {
  elementType: string;
  isValidT: (el: unknown) => el is T;
}) {
  return (_arr?: unknown[]): T[] => {
    if (!_arr?.length) {
      throw new Error(`No ${elementType} specified`);
    }
    let arr: T[] = [];
    for (const el of _arr) {
      if (!isValidT(el)) {
        throw new Error(`Invalid ${elementType}: ${el}`);
      }
      arr.push(el);
    }
    return arr;
  };
}

export const validateTFJSLibraries = generalValidate({
  elementType: 'TFJS Library',
  isValidT: isTFJSLibrary,
});

export const validateEnvironments = generalValidate({
  elementType: 'environment',
  isValidT: isEnvironment,
});

export const validateOutputFormats = generalValidate({
  elementType: 'output format',
  isValidT: isOutputFormat,
});
