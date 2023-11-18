import { tunnelmole } from 'tunnelmole';
process.env.TUNNELMOLE_TELEMETRY = '0';
process.env.TUNNELMOLE_QUIET_MODE = '1';

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
  url?: string;

  constructor(port: number) {
    this.port = port;
  }

  async start() {
    // // silenceTunnelmoleOutput();
    this.url = await tunnelmole({
      port: this.port,
    });
    return this.url;
  }

  async close() { // skipcq: JS-0105
  }
}
