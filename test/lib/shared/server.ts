import http, { RequestListener, } from 'http';
import handler from 'serve-handler';

type StartServer = (PORT: number, dist?: string) => Promise<http.Server>;
export const startServer: StartServer = async (port, dist): Promise<http.Server> => {
  try {
    // const server = http.createServer((request, response) => handler(request, response, {
    //   public: dist,
    //   headers: [
    //     {
    //       "source" : "**/*",
    //       "headers": [
    //         {
    //           "key": "Access-Control-Allow-Origin",
    //           "value": "*",
    //         },
    //         {
    //           "key": "Access-Control-Allow-Headers", 
    //           "value": "Origin, X-Requested-With, Content-Type, Accept, Range",
    //         }
    //       ]
    //     }
    //   ]
    // }));
    // server.listen(port, () => {
    //   resolve(server);
    // });
    const callback: RequestListener = (request, response) => handler(request, response, {
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
    })
    return createBaseServer(port, callback);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const createBaseServer = (port: number, requestListener: RequestListener) => new Promise<http.Server>(async resolve => {
  const server = http.createServer(requestListener);
  server.listen(port, () => {
    resolve(server);
  });
});

export const createServerWithResponse = (port: number, response: string) => createBaseServer(port, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write(`<html><head><title>${response}</title></head><body><h1>${response}</h1></body></html>`);
  res.end();
});
