export function ifDefined<T>(argv: Record<string, string | boolean | number>, key: string, type: string) { return typeof argv[key] === type ? argv[key] as T: undefined; }
