import { createServer, request } from "node:http";
import { spawn } from "node:child_process";

const prismPort = 4011;
const publicPort = 4010;
const prefix = "/api/v1";

const prism = spawn(
  "npx",
  ["prism", "mock", "./docs/openapi.yaml", "--port", String(prismPort)],
  { stdio: "inherit", shell: true },
);

function close(code = 0) {
  prism.kill();
  process.exit(code);
}

process.on("SIGINT", () => close(0));
process.on("SIGTERM", () => close(0));
prism.on("exit", (code) => process.exit(code ?? 0));

const server = createServer((req, res) => {
  if (!req.url?.startsWith(prefix)) {
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }

  const targetUrl = new URL(
    req.url.slice(prefix.length) || "/",
    `http://127.0.0.1:${prismPort}`,
  );
  const upstream = request(
    targetUrl,
    {
      method: req.method,
      headers: req.headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 500, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", (error) => {
    res.statusCode = 502;
    res.end(String(error));
  });

  req.pipe(upstream);
});

server.listen(publicPort, () => {
  console.log(
    `Mock proxy listening on http://localhost:${publicPort}${prefix}`,
  );
});
