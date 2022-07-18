import http from 'http';
import puppeteer from 'puppeteer';
import { startServer } from '../../../lib/shared/server';

type Bundle = () => Promise<void>;

const MESSAGES_TO_IGNORE = [
  'Initialization of backend webgl failed',
  'Could not get context for WebGL version 1',
  'Could not get context for WebGL version 2',
  'Error: WebGL is not supported on this device',
  'WebGL is not supported on this device',
];

const isIgnoredMessage = (msg: string) => {
  for (let i = 0; i < MESSAGES_TO_IGNORE.length; i++) {
    const messageToIgnore = MESSAGES_TO_IGNORE[i];
    if (msg.includes(messageToIgnore)) {
      return true;
    }
  }

  return false;
};


export class TestRunner {
  trackTime: boolean;
  log: boolean;
  port: number;
  dist: string;
  _server: http.Server | undefined;
  _browser: puppeteer.Browser | undefined;
  _page: puppeteer.Page | undefined;

  constructor(dist: string, { port = 8099, trackTime = false, log = true } = {}) {
    this.dist = dist;
    this.trackTime = trackTime;
    this.port = port;
    this.log = log;
  }

  getLocal<T extends puppeteer.Browser | puppeteer.Page | http.Server>(key: '_server' | '_browser' | '_page'): T {
    if (!this[key]) {
      throw new Error(`${key.substring(1)} is undefined`);
    }
    return this[key] as T;
  }

  browser = () => this.getLocal<puppeteer.Browser>('_browser');
  page = () => this.getLocal<puppeteer.Page>('_page');
  server = () => this.getLocal<http.Server>('_server');

  async beforeAll(bundle: Bundle) {
    const start = new Date().getTime();

    await bundle();
    this._server = await startServer(this.port, this.dist);

    if (this.trackTime) {
      const end = new Date().getTime();
      console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    }

  }

  async afterAll() {
    const start = new Date().getTime();
    const stopServer = (): Promise<void | Error> => new Promise((resolve) => {
      const server = this.server();
      if (server) {
        server.close(resolve);
      } else {
        console.warn('No server found')
        resolve();
      }
    });

    await Promise.all([
      stopServer(),
    ]);

    if (this.trackTime) {
      const end = new Date().getTime();
      console.log(`Completed post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
  }

  async beforeEach() {
    this._browser = await puppeteer.launch();
    this._page = await this._browser.newPage();
    if (this.log) {
      this._page.on('console', message => {
        const text = message.text().trim();
        if (text.startsWith('Failed to load resource: the server responded with a status of 404')) {
          console.log('404', text, message);
        } else if (!isIgnoredMessage(text)) {
          console.log('[PAGE]', text);
        }
      });
    }
    await this._page.goto(`http://localhost:${this.port}`);
    await this._page.waitForFunction('document.title.endsWith("| Loaded")');
  }

  async afterEach() {
    await this.browser().close(),
    this._browser = undefined;
    this._page = undefined;
  }
}
