require('dotenv').config();

expect.extend({
  toBeWithin(received, [rawDuration, lowerThreshold, upperThreshold]) {
    const lowerBound = rawDuration - lowerThreshold;
    // const lowerBound = 0;
    const upperBound = rawDuration + upperThreshold;
    const getMessage = (not = false, extra?: string) => {
      return () => [
        `Expected ${received.toFixed(3)}${not ? ' not' : ''} to be within ${lowerThreshold}ms-${upperThreshold}ms of ${rawDuration.toFixed(3)}, or [${lowerBound.toFixed(3)}ms, ${upperBound.toFixed(3)}ms].`,
        extra,
      ].join('\n\n');
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
