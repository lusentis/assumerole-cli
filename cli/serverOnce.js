// ServerOnce
// ==========
// 1. creates a server
// 2. waits for a request to be sent
// 3. extracts the querystring
// 4. returns the parsed querystring
//
const http = require("http");
const port = 20819;

const serverOnce = () =>
  new Promise(resolve => {
    const server = http.createServer((request, response) => {
      response.writeHead(200);
      response.write("Now go back to your terminal!");
      response.end();
      server.close();

      const {
        url,
        headers: { host },
      } = request;

      const { searchParams } = new URL(`http://${host}/${url}`);
      const code = searchParams.get("code");

      resolve({ code });
    });

    server.listen(port, "127.0.0.1");
  });

module.exports = serverOnce;
module.exports.port = port;
module.exports.getRedirectURL = () => `http://127.0.0.1:${port}/callback`;
