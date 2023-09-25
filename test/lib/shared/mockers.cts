export function mockFn<T extends (...args: any[]) => any>(fn: T) {
  return <jest.MockedFunction<typeof fn>>fn;
}

export function mock<T = any>(namespace: T) {
  return <jest.Mocked<typeof namespace>>namespace;
}
