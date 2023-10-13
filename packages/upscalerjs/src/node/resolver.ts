// Shim to allow for unit testing
export const resolver = (name: string): string => {
  try {
    return require.resolve(name);
  } catch(err) {
    return require.resolve(name, {
      paths: [process.cwd(),],
    });
  }
};
