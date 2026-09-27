/**
 * Servidor estático mínimo, sem dependências.
 *   node server.mjs            -> http://localhost:4173
 *   PORT=8080 node server.mjs  -> http://localhost:8080
 */
import { createServer } from "node:http";
import { createReadStream, promises as fs } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.env.PORT || 4173);
// 0.0.0.0 = escuta na rede local (celular na mesma wifi). Use HOST=127.0.0.1
// para restringir a esta máquina.
const HOST = process.env.HOST || "0.0.0.0";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

// nada disto é servido, mesmo com o servidor exposto na rede local
const BLOQUEADO = [
  "node_modules", ".git", ".svn", ".hg",
  ".env", ".env.local", ".env.production", ".npmrc",
  "package-lock.json", "server.mjs",
];

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";

    const filePath = join(ROOT, normalize(pathname).replace(/^(\.\.[/\\])+/, ""));
    if (!filePath.startsWith(ROOT + sep) && filePath !== join(ROOT, "index.html")) {
      res.writeHead(403).end("403 Forbidden");
      return;
    }

    const relativo = filePath.slice(ROOT.length + 1).split(sep);
    if (relativo.some((parte) => BLOQUEADO.includes(parte))) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      res.end("403 Forbidden");
      return;
    }

    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) {
      res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
      res.end("<h1>404</h1><p>Nao encontrado: " + pathname + "</p>");
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const etag = `W/"${stat.size}-${stat.mtimeMs.toString(36)}"`;
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304).end();
      return;
    }

    res.writeHead(200, {
      "content-type": TYPES[ext] || "application/octet-stream",
      "content-length": stat.size,
      etag,
      // dev: html/css/js nunca em cache (evita tela com CSS velho)
      "cache-control": [".html", ".css", ".js", ".mjs"].includes(ext)
        ? "no-cache"
        : "public, max-age=3600",
    });
    createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500).end("500 " + err.message);
  }
});

server.listen(PORT, HOST, () => {
  const redes = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
  const privado = redes.filter((ip) =>
    /^192\.168\./.test(ip) || /^10\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
  const lan = privado[0] || redes[0];

  console.log(`\n  SAIFEN SECURITY — presença invisível`);
  console.log(`\n  neste computador   http://localhost:${PORT}`);
  if (HOST !== "127.0.0.1" && HOST !== "localhost" && lan) {
    console.log(`  na rede (celular)  http://${lan}:${PORT}`);
    redes.filter((ip) => ip !== lan).forEach((ip) => console.log(`                     http://${ip}:${PORT}`));
  } else if (lan) {
    console.log(`\n  Para abrir no celular use: HOST=0.0.0.0 npm start  ->  http://${lan}:${PORT}`);
  }
  console.log(`\n _ctrl+C para encerrar_\n`);
});
