import http from 'http';
import puppeteer from 'puppeteer';
import { startServer } from '../../lib/shared/server';
import { isIgnoredMessage } from './messages';
import { timeit } from './timeit';

type Bundle = () => Promise<void>;

const DEFAULT_PORT = 8098;

export type MockCDN = (port: number, model: string, pathToModel: string) => string;
export type AfterEachCallback = () => Promise<void | any>;

export class BrowserTestRunner {
  trackTime: boolean;
  showWarnings: boolean;
  log: boolean;
  port: number;
  dist: string;
  private _mockCDN: MockCDN | undefined;
  private _server: http.Server | undefined;
  private _browser: puppeteer.Browser | undefined;
  private _page: puppeteer.Page | undefined;

  constructor({
    mockCDN = undefined,
    dist = '',
    port = DEFAULT_PORT,
    trackTime = false,
    log = true,
    showWarnings = false,
  }: {
    mockCDN?: MockCDN;
    dist?: string;
    port?: number;
    trackTime?: boolean;
    log?: boolean;
    showWarnings?: boolean;
  } = {}) {
    this.mockCDN = mockCDN;
    this.dist = dist;
    this.showWarnings = showWarnings;
    this.trackTime = trackTime;
    this.port = port;
    this.log = log;
  }

  /****
   * Getters and setters
   */

  getLocal<T extends puppeteer.Browser | puppeteer.Page | http.Server>(key: '_server' | '_browser' | '_page'): T {
    if (!this[key]) {
      throw new Error(`${key.substring(1)} is undefined`);
    }
    return this[key] as T;
  }

  get mockCDN(): MockCDN | undefined { return this._mockCDN; }
  set mockCDN(mockCDN: MockCDN | undefined) { this._mockCDN = mockCDN; }

  get server(): http.Server { return this.getLocal('_server'); }
  set server(server: http.Server | undefined) {
    if (server && this._server) {
      throw new Error('Server is already active');
    }
    this._server = server;
  }

  get browser(): puppeteer.Browser { return this.getLocal('_browser'); }
  set browser(browser: puppeteer.Browser | undefined) {
    if (browser && this._browser) {
      throw new Error('Browser is already active');
    }
    this._browser = browser;
  }

  get page(): puppeteer.Page {
    const page = this.getLocal<puppeteer.Page>('_page');
    // if (page && page.isClosed() === true) {
    //   throw new Error('Page is already closed; did you forget to close and restart the browser?');
    // }
    return page;
  }
  set page(page: puppeteer.Page | undefined) {
    {
      if (page && this._page) {
        throw new Error('Page is already active');
      }
      this._page = page;
    }
  }

  /****
   * Utility methods
   */

  warn (msg: string) {
    if (this.showWarnings) {
      console.warn(msg);// skipcq: JS-0002
    }
  }

  async waitForTitle(pageTitleToAwait: string) {
    await this.page.waitForFunction(`document.title.endsWith("${pageTitleToAwait}")`);
  }

  async navigateToServer(pageTitleToAwait: string | null) {
    await this.page.goto(`http://localhost:${this.port}`);
    if (pageTitleToAwait !== null) {
      await this.waitForTitle(pageTitleToAwait);
    }
  }

  /****
   * Start and stop methods
   */

  async startServer(dist?: string, port?: number) {
    this.server = await startServer(port || this.port, dist || this.dist);
    return this.server;
  }

  stopServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.close(err => {
          if (err) {
            reject(err);
          } else {
            this.server = undefined;
            resolve();
          }
        });
      } catch (err) {
        this.warn('No server found');
        resolve();
      }
    })
  }

  async startBrowser() {
    this.browser = await puppeteer.launch();
    this.page = await this.browser.newPage();
    if (this.log) {
      this.page.on('console', message => {
        const text = message.text().trim();
        if (text.startsWith('Failed to load resource: the server responded with a status of 404')) {
          console.log('404', text, message);
        } else if (!isIgnoredMessage(text)) {
          console.log('[PAGE]', text);
        }
      });
    }

    const mockCDN = this.mockCDN;
    if (mockCDN !== undefined) {
      this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        const url = request.url();

        // this is a request for a model
        if (url.includes('@upscalerjs')) {
          const modelPath = url.split('@upscalerjs/').pop()?.split('@');
          if (!modelPath?.length) {
            throw new Error(`URL ${url} is not a model`);
          }
          const [model, restOfModelPath] = modelPath;
          const [_, ...pathToModel] = restOfModelPath.split('/');
          const redirectedURL = mockCDN(this.port, model, pathToModel.join('/'));
          request.continue({
            url: redirectedURL,
          });
        } else {
          request.continue();
        }
      });
    }
  }

  async stopBrowser() {
    try {
      await this.browser.close();
      this.browser = undefined;
      this.page = undefined;
    } catch (err) {
      this.warn('No browser found');
    }
  }

  /****
   * Jest lifecycle methods
   */

  @timeit<[Bundle], BrowserTestRunner>('beforeAll scaffolding')
  async beforeAll(bundle: Bundle) {
    await bundle();
    await this.startServer();
  }

  @timeit('afterAll clean up')
  async afterAll() {
    const stopBrowser = this._browser ? this.stopBrowser : () => {};
    await Promise.all([
      this.stopServer(),
      stopBrowser,
    ]);
  }

  @timeit<[string], BrowserTestRunner>('beforeEach scaffolding')
  async beforeEach(pageTitleToAwait: string | null = '| Loaded') {
    await this.startBrowser();
    await this.navigateToServer(pageTitleToAwait);
  }

  @timeit<[AfterEachCallback], BrowserTestRunner>('afterEach clean up')
  async afterEach(callback: AfterEachCallback = async () => {}) {
    await Promise.all([
      this.stopBrowser(),
      callback(),
    ]);
  }
}
