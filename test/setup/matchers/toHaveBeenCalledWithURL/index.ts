import { Mock } from "vitest";

expect.extend({
  toHaveBeenCalledWithURL(spy: Mock, expectedString: string | RegExp) {
    const { isNot } = this;
    let urls: string[] = [];
    if (isNot) {
      let urls: string[] = [];
      for (const [request] of spy.mock.calls) {
        const url = request.url();
        urls.push(url);
        const includes = typeof expectedString === 'string' ? url.includes(expectedString) : expectedString.test(url);
        if (includes) {
          return {
            message: () => `expected none of the urls in ${urls.join(',')} calls to contain ${expectedString} but one did`,
            pass: false,
          }
        }
      }
    } else {
      for (const [request] of spy.mock.calls) {
        const url = request.url();
        urls.push(url);
        const includes = typeof expectedString === 'string' ? url.includes(expectedString) : expectedString.test(url);
        if (includes) {
          return {
            message: () => '',
            pass: true,
          }
        }
      }
    }
    return {
      message: () => `expected one of the urls in ${urls.join(',')} calls to ${isNot ? 'not' : ''} contain ${expectedString}`,
      pass: false,
    }
  },
});
