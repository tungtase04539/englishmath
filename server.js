// Backend nhỏ: phục vụ web tĩnh + proxy chấm phát âm Speechace (giữ key an toàn phía server).
// Chạy: node server.js   (mặc định cổng 5500)
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5500;
const ROOT = __dirname;

// Đọc cấu hình Speechace từ speechace.config.json (KHÔNG chia sẻ file này cho ai)
let CFG = { key: "", endpoint: "https://api2.speechace.com", dialect: "en-us" };
try {
  CFG = Object.assign(CFG, JSON.parse(fs.readFileSync(path.join(ROOT, "speechace.config.json"), "utf8")));
} catch (e) { console.warn("Chưa có speechace.config.json — /api/assess sẽ báo lỗi cho tới khi cấu hình."); }

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml"
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function buildMultipart(fields, fileField, fileName, fileBuffer, fileContentType) {
  const boundary = "----mathenglish" + Date.now();
  const parts = [];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
  }
  parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: ${fileContentType}\r\n\r\n`));
  parts.push(fileBuffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return { body: Buffer.concat(parts), boundary };
}

async function handleAssess(req, res) {
  if (!CFG.key) {
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Server chưa cấu hình Speechace key (speechace.config.json)." }));
  }
  const q = new URL(req.url, "http://localhost").searchParams;
  const text = q.get("text") || "";
  const audio = await readBody(req);
  if (!audio.length) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Không nhận được audio." }));
  }
  const ext = (req.headers["content-type"] || "").includes("wav") ? "wav" : "webm";
  const { body, boundary } = buildMultipart(
    { text, user_audio_file_meta: "" }, "user_audio_file", "audio." + ext, audio, req.headers["content-type"] || "audio/webm"
  );
  const apiUrl = new URL(CFG.endpoint + "/api/scoring/text/v9/json");
  apiUrl.searchParams.set("key", CFG.key);
  apiUrl.searchParams.set("dialect", CFG.dialect);
  apiUrl.searchParams.set("user_id", "mathenglish-local");

  const opts = {
    method: "POST", hostname: apiUrl.hostname, path: apiUrl.pathname + apiUrl.search,
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": body.length }
  };
  const upstream = https.request(opts, up => {
    const chunks = [];
    up.on("data", c => chunks.push(c));
    up.on("end", () => {
      res.writeHead(up.statusCode, { "Content-Type": "application/json" });
      res.end(Buffer.concat(chunks));
    });
  });
  upstream.on("error", e => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Lỗi gọi Speechace: " + e.message }));
  });
  upstream.write(body);
  upstream.end();
}

http.createServer((req, res) => {
  if (req.url.startsWith("/api/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, speechace: !!CFG.key }));
  }
  if (req.url.startsWith("/api/assess") && req.method === "POST") return handleAssess(req, res);
  serveStatic(req, res);
}).listen(PORT, () => console.log(`MathEnglish chạy tại http://localhost:${PORT}/  (Speechace: ${CFG.key ? "ON" : "chưa cấu hình"})`));
