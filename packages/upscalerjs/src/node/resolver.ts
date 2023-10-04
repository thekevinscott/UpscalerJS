// Shim to allow for unit testing
export const resolver = (name: string): string => require.resolve(name);
