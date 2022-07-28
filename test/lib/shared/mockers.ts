export function mockFn<T extends (...args: any[]) => any>(fn: T) {
  return <jest.MockedFunction<typeof fn>>fn;
}
