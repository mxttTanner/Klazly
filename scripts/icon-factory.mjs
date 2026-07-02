// One-shot icon factory: GET / serves a page that renders the Klazly
// wordmark icons on canvas (Inter 900 from Google Fonts) and POSTs each
// PNG back same-origin; POST /save?name=<file> writes it to this dir.
import http from "node:http";
import { writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

const PAGE = /* html */ `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap" rel="stylesheet">
<style>body{font-family:Inter,sans-serif;background:#111;color:#eee;padding:20px}img{margin:6px;vertical-align:middle}</style>
</head><body><h3 id="st">rendering…</h3><div id="out"></div>
<script>
function wordmark(size, maskable) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0f172a';
  if (maskable) { ctx.fillRect(0,0,size,size); }
  else { const r = size*11/48; ctx.beginPath(); ctx.roundRect(0,0,size,size,r); ctx.fill(); }
  const target = size * (maskable ? 0.62 : 0.78);
  let fs = size*0.3;
  ctx.font = '900 '+fs+'px Inter'; ctx.letterSpacing = (-0.02*fs).toFixed(2)+'px';
  fs = fs * target / ctx.measureText('Klazly').width;
  ctx.font = '900 '+fs+'px Inter'; ctx.letterSpacing = (-0.02*fs).toFixed(2)+'px';
  const mAll = ctx.measureText('Klazly'), mKlaz = ctx.measureText('Klaz');
  const x0 = (size - mAll.width)/2;
  const yMid = size/2 + (mAll.actualBoundingBoxAscent - mAll.actualBoundingBoxDescent)/2;
  ctx.fillStyle = '#fff'; ctx.fillText('Klaz', x0, yMid);
  ctx.fillStyle = '#34d399'; ctx.fillText('ly', x0 + mKlaz.width, yMid);
  return c;
}
function monogram(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0f172a';
  const r = size*11/48; ctx.beginPath(); ctx.roundRect(0,0,size,size,r); ctx.fill();
  const fs = size*0.72;
  ctx.font = '900 '+fs+'px Inter';
  const m = ctx.measureText('K');
  const dotR = Math.max(1, size*0.085), gap = size*0.07;
  const total = m.width + gap + dotR*2;
  const x0 = (size - total)/2;
  const yMid = size/2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent)/2;
  ctx.fillStyle = '#fff'; ctx.fillText('K', x0, yMid);
  ctx.fillStyle = '#34d399';
  ctx.beginPath(); ctx.arc(x0 + m.width + gap + dotR, yMid - dotR, dotR, 0, Math.PI*2); ctx.fill();
  return c;
}
(async () => {
  await document.fonts.load('900 100px Inter');
  const jobs = [
    ['wm-512.png', wordmark(512, false)],
    ['wm-512-maskable.png', wordmark(512, true)],
    ['wm-192.png', wordmark(192, false)],
    ['wm-apple-180.png', wordmark(180, false)],
    ['wm-48.png', monogram(48)],
    ['wm-32.png', monogram(32)],
    ['wm-16.png', monogram(16)],
  ];
  const out = document.getElementById('out');
  for (const [name, canvas] of jobs) {
    const b64 = canvas.toDataURL('image/png').split(',')[1];
    await fetch('/save?name=' + name, { method: 'POST', body: b64 });
    const img = document.createElement('img'); img.src = canvas.toDataURL(); img.title = name;
    if (canvas.width > 100) img.style.width = '96px';
    out.appendChild(img);
  }
  document.getElementById('st').textContent = 'DONE — ' + jobs.length + ' icons saved';
  document.title = 'ICONS-DONE';
})();
</script></body></html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(PAGE);
  } else if (req.method === "POST" && url.pathname === "/save") {
    const name = (url.searchParams.get("name") || "").replace(/[^a-z0-9.-]/gi, "");
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      writeFileSync(path.join(DIR, name), Buffer.from(body, "base64"));
      console.log("saved", name);
      res.writeHead(200);
      res.end("ok");
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});
server.listen(4599, "127.0.0.1", () => console.log("listening on 4599"));
