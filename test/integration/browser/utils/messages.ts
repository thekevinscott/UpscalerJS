import puppeteer from 'puppeteer';

const MESSAGES_TO_IGNORE = [
  'Initialization of backend webgl failed',
  'Could not get context for WebGL version 1',
  'Could not get context for WebGL version 2',
  'Error: WebGL is not supported on this device',
  'WebGL is not supported on this device',
];

export const isIgnoredMessage = (msg: string) => {
  for (let i = 0; i < MESSAGES_TO_IGNORE.length; i++) {
    const messageToIgnore = MESSAGES_TO_IGNORE[i];
    if (msg.includes(messageToIgnore)) {
      return true;
    }
  }

  return false;
};

export const attachLogger = (page: puppeteer.Page) => {
  page.on('console', message => {
    const text = message.text().trim();
    if (text.startsWith('Failed to load resource: the server responded with a status of 404')) {
      console.log('404', text, message);
    } else if (!isIgnoredMessage(text)) {
      console.log('[PAGE]', text);
    }
  });
};
