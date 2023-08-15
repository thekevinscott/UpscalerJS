export function timeit<T extends unknown[], R extends { trackTime: boolean }>(msg: string) {
  return  (
    testRunner: R,
    _: string | symbol,
    descriptor: PropertyDescriptor
  ) => {
    const origFn = descriptor.value;
    descriptor.value = async function (...args: T) {
      const start = new Date().getTime();
      const result = await origFn.apply(this, args);

      if (testRunner.trackTime) {
        const end = new Date().getTime();
        const duration = Math.round((end - start) / 1000);
        console.log(`Completed ${msg} in ${duration} seconds`);
      }
      return result;
    };
    return descriptor;
  };
}

