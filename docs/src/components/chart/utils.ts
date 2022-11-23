export const isString = (value?: unknown): value is string => {
  return Boolean(value) && typeof value === 'string';
}

export const getActive = (key: string): (string | undefined)[] => {
  const params = new URLSearchParams(window.location.search);
  return params.get(key)?.split(',') || [];
}
