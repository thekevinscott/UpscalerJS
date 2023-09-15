import { tunnelmole } from 'tunnelmole';
// import localtunnel from 'localtunnel';
// import ngrok from 'ngrok';
// import { info, warn } from '@internals/common/logger';
// import { service, tunnel } from "cloudflared";
// import { warn } from '@internals/common/logger';
// import path from 'path';
// import * as url from 'url';

// const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const regexp = new RegExp(/^http(.*) is forwarding to(.*)/);
const silenceTunnelmoleOutput = () => {
  const origInfo = console.info;
  console.info = (msg: string) => {
    if (!regexp.test(msg)) {
      origInfo.call(console, msg);
    }
  };
};

export class Tunnel {
  port: number;
  // private localtunnel?: ReturnType<typeof localtunnel>;
  url?: string;
  // private _stop: any;
  
  constructor(port: number) {
    this.port = port;
  }

  // get url() {
  //   // if (!this.localtunnel) {
  //   //   throw new Error('Tunnel was never started, ensure you call start');
  //   // }
  //   // return this.localtunnel?.url;
  // }

  async start() {
    // ngrok
    // this.url = await ngrok.connect({
    //   addr: this.port,
    // });

    // local tunnel
    // console.log(this.port)
    // this.localtunnel = await localtunnel({ port: this.port });
    // return this.localtunnel.url;


    // tunnelmole
    silenceTunnelmoleOutput();
    this.url = await tunnelmole({
      port: this.port,
    });
    return this.url;
    
    // // cloudflared
    // const { url, stop, child, ...rest } = tunnel({ "--url": `localhost:${this.port}`, '--config': path.resolve(__dirname, './config.yaml')});

    // child?.stdout?.on('data', data => console.log(data.toString()));
    // child?.stderr?.on('data', data => console.log(data.toString()));
    // console.log(rest, url)
    // this._stop = stop;
    // const timers = [
    //   setTimeout(() => {
    //     warn('Still awaiting cloudflare tunnel to start')
    //   }, 3000),
    //   setTimeout(() => {
    //     throw new Error('Cloudflare tunnel failed to start in 10 seconds')
    //   }, 5000),
    // ];
    // this.url = await url;
    // timers.forEach(clearTimeout);
    // return url;
  }

  async close() { // skipcq: JS-0105
    // if (!this._stop) {
    //   throw new Error('No stop command was set')
    // }
    // return this._stop();
    // localtunnel
    // return new Promise(resolve => {
    //   if (this.localtunnel) {
    //     this.localtunnel.on('close', () => {
    //       info('tunnel has been closed');
    //     });
    //   } else {
    //     warn('Tunnel was never started, so it cannot be closed');
    //   }
    // });
  }
}
