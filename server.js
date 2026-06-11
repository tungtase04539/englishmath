// Backend nhỏ: phục vụ web tĩnh + proxy chấm phát âm Speechace (giữ key an toàn phía server).
// Chạy: node server.js   (mặc định cổng 5500)
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5500;
const ROOT = __dirname;

// Đọc cấu hình Speechace từ speechace.config.json (KHÔNG chia sẻ file này cho ai)
let CFG = { key: "", endpoint: "https://api2.speechace.com", dialect: "en-us", supabaseUrl: "", supabaseKey: "" };
try {
  CFG = Object.assign(CFG, JSON.parse(fs.readFileSync(path.join(ROOT, "speechace.config.json"), "utf8")));
} catch (e) { console.warn("Chưa có speechace.config.json — /api/assess sẽ báo lỗi cho tới khi cấu hình."); }
try {
  CFG = Object.assign(CFG, JSON.parse(fs.readFileSync(path.join(ROOT, "supabase.config.json"), "utf8")));
} catch (e) {}

// Env vars override file config (dùng trên Vercel — không commit key vào code).
// Lưu key đã decode (server tự encode lại khi gọi API), endpoint/dialect tuỳ chọn.
if (process.env.SPEECHACE_KEY) CFG.key = process.env.SPEECHACE_KEY;
if (process.env.SPEECHACE_ENDPOINT) CFG.endpoint = process.env.SPEECHACE_ENDPOINT;
if (process.env.SPEECHACE_DIALECT) CFG.dialect = process.env.SPEECHACE_DIALECT;

// Service role key (BÍ MẬT — chỉ phía server, để tạo tài khoản học sinh).
// Ưu tiên env var (Vercel); local đọc từ service.config.json (đã gitignore).
let SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
if (!SERVICE_ROLE) {
  try { SERVICE_ROLE = JSON.parse(fs.readFileSync(path.join(ROOT, "service.config.json"), "utf8")).serviceRole || ""; } catch (e) {}
}

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
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
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

// Tạo tài khoản học sinh — chỉ giáo viên/admin đã duyệt mới được gọi.
async function handleCreateStudent(req, res) {
  const json = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
  const supaUrl = process.env.SUPABASE_URL || CFG.supabaseUrl || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || CFG.supabaseKey || "";
  if (!SERVICE_ROLE || !supaUrl) return json(500, { error: "Server chưa cấu hình service role." });

  // 1) Xác thực token của người gọi
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return json(401, { error: "Thiếu token đăng nhập." });
  let caller;
  try {
    const r = await fetch(supaUrl + "/auth/v1/user", { headers: { apikey: anonKey, Authorization: "Bearer " + token } });
    if (!r.ok) return json(401, { error: "Phiên đăng nhập không hợp lệ." });
    caller = await r.json();
  } catch (e) { return json(502, { error: "Lỗi xác thực: " + e.message }); }

  // 2) Kiểm tra vai trò người gọi (teacher/admin + đã duyệt)
  const SRH = { apikey: SERVICE_ROLE, Authorization: "Bearer " + SERVICE_ROLE, "Content-Type": "application/json" };
  let prof;
  try {
    const r = await fetch(`${supaUrl}/rest/v1/mathenglish_profiles?id=eq.${caller.id}&select=role,approved`, { headers: SRH });
    prof = (await r.json())[0];
  } catch (e) { return json(502, { error: "Lỗi đọc hồ sơ: " + e.message }); }
  if (!prof || !["teacher", "admin"].includes(prof.role) || prof.approved !== true) {
    return json(403, { error: "Chỉ giáo viên/admin đã duyệt mới được tạo tài khoản học sinh." });
  }

  // 3) Đọc dữ liệu và tạo học sinh
  let body;
  try { body = JSON.parse((await readBody(req)).toString("utf8") || "{}"); } catch (e) { return json(400, { error: "Dữ liệu không hợp lệ." }); }
  const email = (body.email || "").trim();
  const password = body.password || "";
  const fullName = (body.full_name || email.split("@")[0] || "Học sinh").trim();
  if (!email || password.length < 6) return json(400, { error: "Cần email hợp lệ và mật khẩu tối thiểu 6 ký tự." });

  try {
    const r = await fetch(supaUrl + "/auth/v1/admin/users", {
      method: "POST", headers: SRH,
      body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName, role: "student" } })
    });
    const created = await r.json();
    if (!created.id) return json(400, { error: created.msg || created.error_description || created.error || "Không tạo được tài khoản (email có thể đã tồn tại)." });
    // Học sinh do giáo viên tạo: duyệt sẵn để dùng được ngay
    await fetch(`${supaUrl}/rest/v1/mathenglish_profiles?id=eq.${created.id}`, {
      method: "PATCH", headers: SRH, body: JSON.stringify({ approved: true, full_name: fullName, role: "student" })
    });
    return json(200, { ok: true, email, full_name: fullName });
  } catch (e) { return json(502, { error: "Lỗi tạo tài khoản: " + e.message }); }
}

http.createServer((req, res) => {
  if (req.url.startsWith("/api/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, speechace: !!CFG.key }));
  }
  if (req.url.startsWith("/api/config")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL || CFG.supabaseUrl || "",
      supabaseKey: process.env.SUPABASE_ANON_KEY || CFG.supabaseKey || ""
    }));
  }
  if (req.url.startsWith("/api/assess") && req.method === "POST") return handleAssess(req, res);
  if (req.url.startsWith("/api/create-student") && req.method === "POST") return handleCreateStudent(req, res);
  serveStatic(req, res);
}).listen(PORT, () => console.log(`MathEnglish chạy tại http://localhost:${PORT}/  (Speechace: ${CFG.key ? "ON" : "chưa cấu hình"})`));
