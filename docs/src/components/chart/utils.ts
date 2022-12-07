export const isString = (value?: unknown): value is string => {
  return Boolean(value) && typeof value === 'string';
}

export const getActive = (params: URLSearchParams, key: string): (string | undefined)[] => {
  return params.get(key)?.split(',') || [];
}
