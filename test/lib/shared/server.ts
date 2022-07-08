import http from 'http';
import handler from 'serve-handler';

type StartServer = (PORT: number, DIST: string) => Promise<http.Server>;
export const startServer: StartServer = (PORT, DIST) => new Promise<http.Server>(async resolve => {
  try {
    const server = http.createServer((request, response) => handler(request, response, {
      public: DIST,
    }));
    server.listen(PORT, () => {
      resolve(server);
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
});

