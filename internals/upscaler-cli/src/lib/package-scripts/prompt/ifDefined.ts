export function ifDefined<T>(argv: Record<string, any>, key: string, type: string) { return typeof argv[key] === type ? argv[key] as T: undefined; }
