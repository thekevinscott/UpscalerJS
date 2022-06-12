// Shim to allow for unit testing
export const resolver = (name: string) => require.resolve(name);
