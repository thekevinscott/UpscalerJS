const MESSAGES_TO_IGNORE = [
  'Initialization of backend webgl failed',
  'Could not get context for WebGL version 1',
  'Could not get context for WebGL version 2',
  'Error: WebGL is not supported on this device',
  'WebGL is not supported on this device',
];

export const isIgnoredMessage = (msg: string) => {
  for (const messageToIgnore of MESSAGES_TO_IGNORE) {
    if (msg.includes(messageToIgnore)) {
      return true;
    }
  }

  return false;
};

