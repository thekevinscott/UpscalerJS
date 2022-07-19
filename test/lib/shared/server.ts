import http from 'http';
import handler from 'serve-handler';

type StartServer = (PORT: number, dist: string) => Promise<http.Server>;
export const startServer: StartServer = (port, dist) => new Promise<http.Server>(async resolve => {
  try {
    const server = http.createServer((request, response) => handler(request, response, {
      public: dist,
      headers: [
        {
          "source" : "**/*",
          "headers": [
            {
              "key": "Access-Control-Allow-Origin",
              "value": "*",
            },
            {
              "key": "Access-Control-Allow-Headers", 
              "value": "Origin, X-Requested-With, Content-Type, Accept, Range",
            }
          ]
        }
      ]
    }));
    server.listen(port, () => {
      resolve(server);
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
});

