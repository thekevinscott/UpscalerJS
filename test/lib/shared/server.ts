import http from 'http';
import handler from 'serve-handler';

type StartServer = (PORT: number, dist: string) => Promise<http.Server>;
export const startServer: StartServer = (port, dist) => new Promise<http.Server>(async resolve => {
  try {
    const server = http.createServer((request, response) => handler(request, response, {
      public: dist,
    }));
    server.listen(port, () => {
      resolve(server);
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
});

