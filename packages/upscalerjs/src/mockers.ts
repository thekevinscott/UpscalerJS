export function mockFn<T extends (...args: unknown[]) => unknown>(fn: T) {
  return <jest.MockedFunction<typeof fn>>fn;
}

export function mock<T = unknown>(namespace: T) {
  return <jest.Mocked<typeof namespace>>namespace;
}
