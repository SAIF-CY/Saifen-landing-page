/**
 * Screenshot via Chrome DevTools Protocol (sem dependencias).
 *   node tools/shot.mjs <url> <saida.png> [largura] [full|viewport]
 * Ex.: node tools/shot.mjs http://127.0.0.1:4173/ /tmp/pagina.png 1440 full
 */
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url = "http://127.0.0.1:4173/", out = "shot.png", widthArg = "1440", modeArg = "full"] = process.argv;
const width = Number(widthArg);
const full = modeArg !== "viewport";
const port = 9300 + (process.pid % 300);
const profile = mkdtempSync(join(tmpdir(), "shot-"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn("google-chrome", [
  "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
  "--force-device-scale-factor=1", "--disable-extensions", "--mute-audio",
  "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, "about:blank",
], { stdio: "ignore" });

async function findTarget() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("Chrome nao respondeu na porta de depuracao");
}

const ws = new WebSocket(await findTarget());
await new Promise((res, rej) => { ws.addEventListener("open", res); ws.addEventListener("error", rej); });

let seq = 0;
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    const onMsg = (e) => {
      const m = JSON.parse(e.data);
      if (m.id !== id) return;
      ws.removeEventListener("message", onMsg);
      m.error ? reject(new Error(`${method}: ${JSON.stringify(m.error)}`)) : resolve(m.result);
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });

const metrics = (h) => send("Emulation.setDeviceMetricsOverride", { width, height: h, deviceScaleFactor: 1, mobile: false });

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await metrics(900);
  await send("Page.navigate", { url });
  await sleep(400);

  // espera fontes + imagens eager
  const race = (p, ms) => Promise.race([p, sleep(ms).then(() => null)]);
  await race(send("Runtime.evaluate", {
    expression: `(async () => {
      if (document.fonts) await document.fonts.ready;
      await Promise.all([...document.images].filter(i => i.loading !== 'lazy' && !i.complete)
        .map(i => new Promise(r => { i.onload = i.onerror = r; })));
      return true;
    })()`,
    awaitPromise: true,
  }), 8000);

  // rola a pagina para disparar lazy-load e as animacoes de revelacao
  const { result: hRes } = await send("Runtime.evaluate", { expression: "Math.ceil(document.documentElement.scrollHeight)", returnByValue: true });
  const pageH = hRes.value;
  for (let y = 0; y < pageH; y += 700) {
    await send("Runtime.evaluate", { expression: `window.scrollTo(0, ${y}); true`, returnByValue: true });
    await sleep(110);
  }
  await send("Runtime.evaluate", { expression: "window.scrollTo(0, document.documentElement.scrollHeight); true", returnByValue: true });
  await sleep(700);
  await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0); true", returnByValue: true });
  await sleep(500);

  const { result } = await send("Runtime.evaluate", { expression: "Math.ceil(document.documentElement.scrollHeight)", returnByValue: true });
  const height = full ? Math.min(result.value, 30000) : 900;
  // em "full" NAO redimensiona a viewport: isso alteraria sections com 100svh.
  if (!full) await metrics(height);
  await send("Runtime.evaluate", { expression: "window.scrollTo(0,0); true", returnByValue: true });
  await sleep(600);

  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: full });
  writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log(`${out}  ${width}x${height}`);
} finally {
  ws.close();
  chrome.kill();
}
process.exit(0);
