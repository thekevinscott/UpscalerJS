import http from 'http';
import puppeteer from 'puppeteer';
import { startServer } from '../../lib/shared/server';
import { Opts } from '../../lib/shared/prepare';
import { isIgnoredMessage } from './messages';
import { timeit } from './timeit';

type Bundle = (opts?: Opts) => Promise<void>;

const DEFAULT_PORT = 8098;

export type MockCDN = (port: number, model: string, pathToModel: string) => string;
export type AfterEachCallback = () => Promise<void | any>;

const cachedBundles = new Set();

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
  private _context: puppeteer.BrowserContext | undefined;
  private _name?: string;
  private _verbose?: boolean;
  private _usePNPM?: boolean;
  private _cacheBundling?: boolean;

  constructor({
    name,
    mockCDN = undefined,
    dist = '',
    port = DEFAULT_PORT,
    trackTime = false,
    log = true,
    showWarnings = false,
    verbose = false,
    usePNPM = false,
    cacheBundling = true,
  }: {
    name?: string;
    mockCDN?: MockCDN;
    dist?: string;
    port?: number;
    trackTime?: boolean;
    log?: boolean;
    showWarnings?: boolean;
    verbose?: boolean;
    usePNPM?: boolean;
    cacheBundling?: boolean;
  } = {}) {
    this._name = name;
    this.mockCDN = mockCDN;
    this.dist = dist;
    this.showWarnings = showWarnings;
    this.trackTime = trackTime;
    this.port = port;
    this.log = log;
    this._verbose = verbose;
    this._usePNPM = usePNPM;
    this._cacheBundling = cacheBundling;
  }

  /****
   * Getters and setters
   */

  private _getLocal<T extends puppeteer.Browser | puppeteer.Page | puppeteer.BrowserContext | http.Server>(key: '_server' | '_browser' | '_page' | '_context'): T {
    if (!this[key]) {
      throw new Error(this._getLogMessage(`${key.substring(1)} is undefined`));
    }
    return this[key] as T;
  }

  get serverURL() {
    return `http://localhost:${this.port}`;
  }

  get mockCDN(): MockCDN | undefined { return this._mockCDN; }
  set mockCDN(mockCDN: MockCDN | undefined) { this._mockCDN = mockCDN; }

  get server(): http.Server { return this._getLocal('_server'); }
  set server(server: http.Server | undefined) {
    if (server && this._server) {
      throw new Error(this._getLogMessage(`Server is already active`));
    }
    this._server = server;
  }

  get browser(): puppeteer.Browser { return this._getLocal('_browser'); }
  set browser(browser: puppeteer.Browser | undefined) {
    if (browser && this._browser) {
      throw new Error(this._getLogMessage(`Browser is already active`));
    }
    this._browser = browser;
  }


  get context(): puppeteer.BrowserContext { return this._getLocal('_context'); }
  set context(context: puppeteer.BrowserContext | undefined) {
    if (context && this._context) {
      throw new Error(this._getLogMessage(`Context is already active`));
    }
    this._context = context;
  }

  get page(): puppeteer.Page {
    const page = this._getLocal<puppeteer.Page>('_page');
    // if (page && page.isClosed() === true) {
    //   throw new Error('Page is already closed; did you forget to close and restart the browser?');
    // }
    return page;
  }
  set page(page: puppeteer.Page | undefined) {
    {
      if (page && this._page) {
        throw new Error(this._getLogMessage(`Page is already active`));
      }
      this._page = page;
    }
  }

  /****
   * Utility methods
   */

  private _getLogMessage (msg: string) {
    return [msg, this._name].filter(Boolean).join(' | ');
  }

  private _warn (msg: string) {
    if (this.showWarnings) {
      console.warn(this._getLogMessage(msg));// skipcq: JS-0002
    }
  }

  public async waitForTitle(pageTitleToAwait: string) {
    await this.page.waitForFunction(`document.title.endsWith("${pageTitleToAwait}")`);
  }

  public async navigateToServer(pageTitleToAwait: string | null) {
    await this.page.goto(this.serverURL);
    if (pageTitleToAwait !== null) {
      await this.waitForTitle(pageTitleToAwait);
    }
  }

  /****
   * Start and stop methods
   */

  async startServer(dist?: string, port?: number) {
    this.server = await startServer(port || this.port, dist || this.dist);
    // console.log(`Server running at ${this.serverURL}`);
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
        this._warn(`No server found`);
        resolve();
      }
    })
  }

  public async startBrowser() {
    this.browser = await puppeteer.launch();
  }

  private _attachLogger() {
    if (this.log) {
      this.page.on('console', message => {
        const type = message.type();
        const text = message.text();
        if (!isIgnoredMessage(text)) {
          console.log(`${type} ${text}`);
        }
      })
        .on('pageerror', ({ message }) => console.log(message))
        .on('response', response => {
          const status = response.status();
          if (`${status}` !== `${200}`) {
            console.log(`${status} ${response.url()}`);
          }
        })
        .on('requestfailed', request =>
          console.log(`${request.failure().errorText} ${request.url()}`))
    }
  }

  private _bootstrapCDN() {
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

  public async createNewPage() {
    this.context = await this.browser.createIncognitoBrowserContext();
    this.page = await this.context.newPage();
    this._attachLogger();
    this._bootstrapCDN();
  }

  public async closeBrowser() {
    try {
      await this.browser.close();
      this.browser = undefined;
    } catch (err) {
      this._warn(`No browser found`);
    }
  }

  private async _closeContext() {
    try {
      await this.context.close();
      this.context = undefined;
      this.page = undefined;
    } catch (err) {
      this._warn(`No context found`);
    }
  }

  private _makeOpts(): Opts {
    return {
      verbose: this._verbose,
      usePNPM: this._usePNPM,
    }
  }

  /****
   * Jest lifecycle methods
   */

  @timeit<[Bundle], BrowserTestRunner>('beforeAll scaffolding')
  async beforeAll(bundle: Bundle) {
    const opts = this._makeOpts();
    const bundleIfNotCached = async () => {
      if (
        this._cacheBundling === false ||
        (this._cacheBundling === true && cachedBundles.has(bundle.name) !== true)
      ) {
        await bundle(opts);
      }
      return this.startServer();
    };
    await Promise.all([
      bundleIfNotCached(),
      this.startBrowser(),
    ]);
    cachedBundles.add(bundle.name);
  }

  @timeit('afterAll clean up')
  async afterAll() {
    await Promise.all([
      this.stopServer(),
      this.closeBrowser(),
    ]);
  }

  @timeit<[string], BrowserTestRunner>('beforeEach scaffolding')
  async beforeEach(pageTitleToAwait: string | null = '| Loaded') {
    await this.createNewPage();
    await this.navigateToServer(pageTitleToAwait);
  }

  @timeit<[AfterEachCallback], BrowserTestRunner>('afterEach clean up')
  async afterEach(callback: AfterEachCallback = async () => {}) {
    await Promise.all([
      this._closeContext(),
      callback(),
    ]);
  }
}
