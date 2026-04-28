const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = process.env.PORT || 4000;
const STATE_FILE = path.join(__dirname, "data-store.json");

const permissions = {
  "Warehouse Manager": ["dashboard", "users", "inventory", "vendors", "purchases", "receiving", "search", "issue", "delivery", "reports"],
  "Warehouse Staff": ["dashboard", "users", "inventory", "vendors", "search", "issue", "delivery"],
  "Purchasing Officer": ["dashboard", "vendors", "purchases", "receiving", "search", "reports"],
  Employee: ["dashboard", "search", "issue", "delivery"],
  Accountant: ["dashboard", "search", "reports"]
};

function createDefaultState() {
  return {
    db: {
      users: [
        { username: "admin", password: "sha256:8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92", role: "Warehouse Manager", status: "Active" },
        { username: "manager01", password: "sha256:03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", role: "Warehouse Manager", status: "Active" },
        { username: "stock01", password: "sha256:03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", role: "Warehouse Staff", status: "Active" },
        { username: "buy01", password: "sha256:03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", role: "Purchasing Officer", status: "Active" }
      ],
      inventory: [
        { code: "HYD-001", name: "Hydraulic Pump", category: "Hydraulic", stock: 25, reorder: 10, price: 4500 },
        { code: "BRA-004", name: "Brass Valve", category: "Brass", stock: 4, reorder: 6, price: 300 }
      ],
      vendors: [{ name: "Thai Hydro Supplier", contact: "02-000-0001", items: "Pump, Seal Kit" }],
      purchases: [{ ref: "PO-1001", date: "2026-04-25", item: "Brass Valve", qty: 20, cost: 240 }],
      receiving: [],
      issues: [],
      deliveries: []
    },
    counters: { issue: 1 },
    updatedAt: Date.now()
  };
}

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      const initial = createDefaultState();
      fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to load state file, using defaults.", err);
    return createDefaultState();
  }
}

let sharedState = loadState();

function saveState() {
  sharedState.updatedAt = Date.now();
  fs.writeFileSync(STATE_FILE, JSON.stringify(sharedState, null, 2), "utf8");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => (raw += chunk));
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function parseUser(reqUrl) {
  const role = reqUrl.searchParams.get("role") || "Employee";
  const username = reqUrl.searchParams.get("username") || "demo";
  return { username, role };
}

function requireAccess(user, screenKey) {
  const allowed = permissions[user.role] || [];
  return allowed.includes(screenKey);
}

function normalizePassword(text) {
  if (!text) return "";
  if (text.startsWith("sha256:")) return text;
  const hash = crypto.createHash("sha256").update(String(text), "utf8").digest("hex");
  return `sha256:${hash}`;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const reqPath = reqUrl.pathname;

  if (req.method === "GET" && reqPath === "/health") {
    return sendJson(res, 200, { ok: true, service: "warehouse-backend" });
  }

  if (req.method === "GET" && reqPath === "/state") {
    return sendJson(res, 200, { ok: true, ...sharedState });
  }

  if (req.method === "PUT" && reqPath === "/state") {
    try {
      const body = await readJsonBody(req);
      if (!body || typeof body !== "object" || !body.db || !body.counters) {
        return sendJson(res, 400, { ok: false, error: "Invalid state payload" });
      }
      sharedState = {
        db: body.db,
        counters: body.counters,
        updatedAt: Date.now()
      };
      saveState();
      return sendJson(res, 200, { ok: true, updatedAt: sharedState.updatedAt });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (req.method === "GET" && reqPath === "/authz/check") {
    const user = parseUser(reqUrl);
    const screen = reqUrl.searchParams.get("screen") || "";
    return sendJson(res, 200, { username: user.username, role: user.role, screen, allowed: requireAccess(user, screen) });
  }

  if (req.method === "POST" && reqPath === "/auth/login") {
    try {
      const body = await readJsonBody(req);
      const username = String(body.username || "").trim();
      const password = normalizePassword(String(body.password || ""));

      const user = (sharedState.db.users || []).find(
        u => u.username === username && normalizePassword(u.password) === password && u.status === "Active"
      );

      if (!user) return sendJson(res, 401, { ok: false, error: "Invalid username or password" });

      return sendJson(res, 200, {
        ok: true,
        user: {
          username: user.username,
          role: user.role
        }
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (req.method === "POST" && reqPath === "/issue/generate-no") {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const seq = String(Math.floor(Math.random() * 900) + 100);
    return sendJson(res, 200, { issueNo: `ISS-${y}${m}${d}-${seq}` });
  }

  if (req.method === "POST" && reqPath === "/users/validate") {
    try {
      const body = await readJsonBody(req);
      const role = body.role || "";
      if (!permissions[role]) return sendJson(res, 400, { ok: false, error: "Unknown role" });
      if (!body.username || String(body.username).trim().length < 3) return sendJson(res, 400, { ok: false, error: "Username too short" });
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  return sendJson(res, 404, { ok: false, error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`warehouse-backend listening on ${PORT}`);
});
