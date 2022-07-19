import http from 'http';
import puppeteer from 'puppeteer';
import { startServer } from '../../../lib/shared/server';
import { isIgnoredMessage } from './messages';

type Bundle = () => Promise<void>;

export class TestRunner {
  trackTime: boolean;
  log: boolean;
  port: number;
  dist: string;
  _server: http.Server | undefined;
  _browser: puppeteer.Browser | undefined;
  _page: puppeteer.Page | undefined;

  constructor({ dist = '', port = 8099, trackTime = false, log = true } = {}) {
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

  setServer = (server: http.Server) => {
    this._server = server;
  }

  async startServer(dist?: string, port?: number) {
    this._server = await startServer(port || this.port, dist || this.dist);
    return this._server;
  }

  async beforeAll(bundle: Bundle) {
    const start = new Date().getTime();

    await bundle();
    await this.startServer();

    if (this.trackTime) {
      const end = new Date().getTime();
      console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    }

  }

  stopServer = (): Promise<void> => new Promise((resolve, reject) => {
    const server = this.server();
    if (server) {
      server.close(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      console.warn('No server found')
      resolve();
    }
  });

  async afterAll() {
    const start = new Date().getTime();

    await Promise.all([
      this.stopServer(),
    ]);

    if (this.trackTime) {
      const end = new Date().getTime();
      console.log(`Completed post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
  }

  async startBrowser(pageTitle: string | null = '| Loaded') {
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
    if (pageTitle !== null) {
      await this._page.waitForFunction(`document.title.endsWith("${pageTitle}")`);
    }
  }

  async beforeEach(pageTitle: string | null = '| Loaded') {
    this.startBrowser(pageTitle);
  }

  async afterEach(callback: AfterEachCallback = () => Promise.resolve()) {
    const browser = this.browser();
    await Promise.all([
      browser.close(),
      callback({ browser }),
    ])
    this._browser = undefined;
    this._page = undefined;
  }
}

type AfterEachCallback = (params: { browser: puppeteer.Browser }) => Promise<void>;
