import { Page, Browser, BrowserContext, launch, } from 'puppeteer';
import { isIgnoredMessage } from './utils/message.js';
import { timeit } from './utils/timeit.js';
import { catchFailures } from './utils/catchFailures.js';
import { HttpServer } from '@internals/http-server';
import { MODELS_DIR } from '@internals/common/constants';

type Bundle = () => Promise<void>;

// const DEFAULT_PORT = 8098;
const DEFAULT_PORT = 0;

const USE_TUNNEL = process.env.useTunnel === '1';

type MockCDN = (server: HttpServer, model: string, pathToModel: string) => string;
export type AfterEachCallback = () => Promise<unknown>;

const getURL = (server?: HttpServer) => {
  if (!server) {
    throw new Error('No server defined');
  }
  const url = server.url;
  if (!url) {
    throw new Error('Server URL is not defined');
  }
  return url;
}


const mockCdn: MockCDN = (server, packageName, pathToModel) => {
  if (!server.url) {
    throw new Error('No URL was available on fixtures server');
  }
  const pathToAsset = [
    server.url,
    packageName,
    pathToModel,
  ].join('/');
  return pathToAsset;
};

export class ClientsideTestRunner {
  trackTime: boolean;
  showWarnings: boolean;
  log: boolean;
  port: number;
  dist?: string;
  useTunnel: boolean;
  private mock: boolean;
  private _server: HttpServer | undefined;
  private _fixtures: HttpServer | undefined;
  private _browser: Browser | undefined;
  private _page: Page | undefined;
  private _context: BrowserContext | undefined;
  private _name?: string;

  constructor({
    name,
    mock = false,
    dist,
    port = DEFAULT_PORT,
    trackTime = false,
    log = true,
    showWarnings = false,
    useTunnel = USE_TUNNEL,
  }: {
    name?: string;
    mock?: boolean;
    dist?: string;
    port?: number;
    trackTime?: boolean;
    log?: boolean;
    showWarnings?: boolean;
    useTunnel?: boolean;
  }) {
    this._name = name;
    this.mock = mock;
    this.dist = dist;
    this.showWarnings = showWarnings;
    this.trackTime = trackTime;
    this.port = port;
    this.log = log;
    this.useTunnel = useTunnel;
  }

  /****
   * Getters and setters
   */

  private _getLocal<T extends Browser | Page | BrowserContext | HttpServer>(key: '_server' | '_fixtures' | '_browser' | '_page' | '_context'): T {
    if (!this[key]) {
      throw new Error(this._getLogMessage(`${key.substring(1)} is undefined`));
    }
    return this[key] as T;
  }

  getServerURL = () => getURL(this.server);
  getFixturesServerURL = () => getURL(this.fixturesServer);

  get server(): HttpServer { return this._getLocal('_server'); }
  set server(server: HttpServer | undefined) {
    if (server && this._server) {
      throw new Error(this._getLogMessage('Server is already active'));
    }
    this._server = server;
  }

  get fixturesServer(): HttpServer { return this._getLocal('_fixtures'); }
  set fixturesServer(fixtures: HttpServer | undefined) {
    if (fixtures && this._fixtures) {
      throw new Error(this._getLogMessage('Fixtures Server is already active'));
    }
    this._fixtures = fixtures;
  }

  get browser(): Browser { return this._getLocal('_browser'); }
  set browser(browser: Browser | undefined) {
    if (browser && this._browser) {
      throw new Error(this._getLogMessage('Browser is already active'));
    }
    this._browser = browser;
  }


  get context(): BrowserContext { return this._getLocal('_context'); }
  set context(context: BrowserContext | undefined) {
    if (context && this._context) {
      throw new Error(this._getLogMessage('Context is already active'));
    }
    this._context = context;
  }

  get page(): Page {
    const page = this._getLocal<Page>('_page');
    // if (page && page.isClosed() === true) {
    //   throw new Error('Page is already closed; did you forget to close and restart the browser?');
    // }
    return page;
  }
  set page(page: Page | undefined) {
    if (page && this._page) {
      throw new Error(this._getLogMessage('Page is already active'));
    }
    this._page = page;
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
    await this.page.goto(await this.getServerURL());
    if (pageTitleToAwait !== null) {
      await this.waitForTitle(pageTitleToAwait);
    }
  }

  /****
   * Start and stop methods
   */

  async startServers({ dist: _dist, name }: { dist?: string; name?: string } = {}): Promise<void> {
    const dist = _dist || this.dist;
    if (!dist) {
      throw new Error('No dist was supplied, either in the constructor to ClientsideTestRunner or as an argument to startServers. Please explicitly provide a dist argument');
    }
    this.server = new HttpServer({
      name: name || this._name,
      port: this.port,
      dist,
      useTunnel: this.useTunnel,
    });

    this.fixturesServer = new HttpServer({
      name: `${this._name}-fixtures`,
      dist: MODELS_DIR,
      useTunnel: this.useTunnel,
    });

    // Note: these must be done sequentially; there's a race condition bug in tunnelmole
    await this.server.start();
    await this.fixturesServer.start();
  }

  async stopServers(): Promise<void> {
    const stopServer = async (server?: HttpServer) => {
      if (!server) {
        this._warn('No server found');
      } else {
        await server.close();
      }
    }
    await Promise.all([
      stopServer(this.server),
      stopServer(this.fixturesServer),
    ]);
    this.server = undefined;
    this.fixturesServer = undefined;
  }

  public async startBrowser() {
    this.browser = await launch({
      headless: 'new',
    });
  }

  private _attachLogger() {
    if (this.log) {
      this.page.on('console', message => {
        const type = message.type();
        const text = message.text();
        if (!isIgnoredMessage(text)) {
          console.log(`[PAGE][${type}] ${text}`);
        }
      })
        .on('pageerror', ({ message }) => console.log(message))
        .on('response', response => {
          const status = response.status();
          if (`${status}` !== `${200}`) {
            console.log(`[PAGE][response][${status}] ${response.url()}`);
          }
        })
        .on('requestfailed', request => { 
            console.log(`[PAGE][requestfailed][${request.failure()?.errorText}] ${request.url()}`);
      })
    }
  }

  private _bootstrapCDN() {
    if (this.mock) {
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
          const redirectedURL = mockCdn(this.fixturesServer, model, pathToModel.join('/'));
          // console.log(`mock request ${url} to ${redirectedURL}`);
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
      this._warn('No browser found');
    }
  }

  private async _closeContext() {
    try {
      await this.context.close();
      this.context = undefined;
      this.page = undefined;
    } catch (err) {
      this._warn('No context found');
    }
  }

  // private _makeOpts(): Opts {
  //   return {
  //     verbose: this._verbose,
  //     usePNPM: this._usePNPM,
  //   }
  // }

  /****
   * Jest lifecycle methods
   */

  @catchFailures()
  @timeit<[Bundle], ClientsideTestRunner>('beforeAll scaffolding')
  async beforeAll(bundle?: Bundle) {
    // const opts = this._makeOpts();
    const _bundle = async () => {
      if (bundle) {
        await bundle();
        // await bundle(opts);
      }
      return this.startServers();
    };
    await Promise.all([
      _bundle(),
      this.startBrowser(),
    ]);
  }

  @catchFailures()
  @timeit('afterAll clean up')
  async afterAll() {
    await Promise.all([
      this.stopServers(),
      this.closeBrowser(),
    ]);
  }

  @catchFailures()
  @timeit<[string], ClientsideTestRunner>('beforeEach scaffolding')
  async beforeEach(pageTitleToAwait: string | null = '| Loaded') {
    await this.createNewPage();
    await this.navigateToServer(pageTitleToAwait);
  }

  @catchFailures()
  @timeit<[AfterEachCallback], ClientsideTestRunner>('afterEach clean up')
  async afterEach(callback?: AfterEachCallback) {
    await Promise.all([
      this._closeContext(),
      callback ? callback() : undefined,
    ]);
  }
}

