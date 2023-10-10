import { Server as HTTPServer, createServer } from 'http';
import handler from 'serve-handler';
import { exists } from '@internals/common/fs';
import { verbose } from '@internals/common/logger';
import { Tunnel } from './Tunnel.js';
import { serverHeaders } from './serverHeaders.js';

export const ERROR_NO_ADDRESS = 'No address found for server';
export const ERROR_STRING_ADDRESS = 'Address is of type string for server';

export const getServerPort = (server: HTTPServer): number => {
  const address = server.address();
  if (!address) {
    throw new Error(ERROR_NO_ADDRESS);
  }
  if (typeof address === 'string') {
    throw new Error(ERROR_STRING_ADDRESS);
  }
  return address.port;
};

const startHttpServer = (httpServer: HTTPServer, port?: number) => new Promise<void>((resolve, reject) => {
  httpServer.listen(port, () => {
    resolve();
  }).on('error', reject);
});

const closeHttpServer = (server: HTTPServer) => new Promise<void>((resolve, reject) => {
  server.close((err) => {
    if (err) {
      reject(err);
    } else {
      resolve();
    }
  });
})

export class HttpServer {
  name?: string;
  port?: number;
  dist: string;
  private httpServer?: HTTPServer;
  private tunnel?: Tunnel;
  // url?: string;
  useTunnel: boolean;

  constructor({ name, port, dist, useTunnel }: { name?: string; port?: number, dist: string, useTunnel: boolean }) {
    this.name = name;
    this.port = port;
    this.dist = dist;
    this.useTunnel = useTunnel;
  }

  start = async () => {
    if (!await exists(this.dist)) {
      throw new Error(`dist Directory "${this.dist}" supplied to server does not exist`);
    }
    const httpServer = createServer((request, response) => handler(request, response, {
      public: this.dist,
      headers: serverHeaders,
    }));
    this.httpServer = httpServer;

    await startHttpServer(httpServer, this.port);
    this.port = getServerPort(httpServer);
    if (this.useTunnel) {
      this.tunnel = new Tunnel(this.port);
      verbose('Starting server with tunnel');
      await this.tunnel.start();
    }
    return this.url;
  }

  get url() {
    if (this.useTunnel) {
      if (!this.tunnel) {
        throw new Error('Tunnel was never set');
      }
      return this.tunnel?.url;
    }
    if (!this.port) {
      throw new Error('Port was never set');
    }

    return `http://localhost:${this.port}`;
  }

  close = async () => {
    const server = this.httpServer;
    // const [server, tunnel] = [this.server, this.tunnel];
    if (!server) {
      throw new Error(`No server was set for name ${this.name}. Did you forget to call .start()?`);
    }
    const closeTunnel = () => {
      if (this.useTunnel) {
        if (!this.tunnel) {
          throw new Error('No tunnel was set.');
        }
        this.tunnel.close();
      }
    }
    await Promise.all([
      closeHttpServer(server),
      closeTunnel(),
    ]);
  }
}
