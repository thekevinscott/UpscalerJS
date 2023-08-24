require('dotenv').config();

expect.extend({
  toBeWithin(received, [rawDuration, lowerThreshold, upperThreshold]) {
    const { isNot } = this;
    if (isNot) {
      throw new Error('isNot is not supported in match Image expectations');
    }
    const lowerBound = rawDuration - lowerThreshold;
    // const lowerBound = 0;
    const upperBound = rawDuration + upperThreshold;
    const getMessage = (not = false, extra?: string) => {
      return () => [
        `Expected ${received.toFixed(3)}`,
        not ? 'not' : undefined,
        'to be within the range of:',
        `\n\n[${lowerBound.toFixed(3)}ms, ${upperBound.toFixed(3)}ms]`,
        `\n\nwhich is ${lowerThreshold}ms below to ${upperThreshold}ms above regarding the raw duration ${rawDuration.toFixed(3)}, `,
        extra,
      ].filter(Boolean).join(' ');
    }
    if (received <= upperBound && received >= lowerBound) {
      return {
        message: getMessage(true),
        pass: true
      };
    } else {
      const extra = received < lowerBound ?
        `The value was less than lower bounds by ${(lowerBound - received).toFixed(3)}ms.` :
        `The value was greater than upper bounds by ${(received - upperBound).toFixed(3)}ms, or ${((1 / (rawDuration / received) - 1) * 100).toFixed(2)}% higher.`;
      return {
        message: getMessage(false, extra),
        pass: false,
      };
    }
  }
});
