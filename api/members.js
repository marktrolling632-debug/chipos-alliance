// Vercel Serverless Function: /api/members
// GET  讀取名錄（公開）
// POST 保存名錄（需 x-admin-token，對應環境變數 ADMIN_TOKEN，預設 chiptos）
//
// 自動偵測並支援三種儲存：
//   1. Redis REST（Vercel KV / Upstash）— 環境變數 *_REST_API_URL / *_REST_API_TOKEN
//   2. Global Config（Edge Config）    — 環境變數 EDGE_CONFIG + VERCEL_API_TOKEN
//   3. 皆無 → 回傳 __noKV，前台沿用內建名錄

const KEY = "chipos:members";
const CFG_KEY = "members";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "chiptos";

/* ---------- 1. Redis REST ---------- */
function pickRedis() {
  const P = [
    [process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN],
    [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN],
    [process.env.REDIS_REST_API_URL, process.env.REDIS_REST_API_TOKEN],
    [process.env.STORAGE_REST_API_URL, process.env.STORAGE_REST_API_TOKEN],
  ];
  for (const [u, t] of P) {
    if (u && t) return { url: String(u).replace(/\/+$/, ""), token: t };
  }
  return null;
}

/* ---------- 2. Global Config（Edge Config） ---------- */
function edgeId() {
  if (process.env.EDGE_CONFIG_ID) return process.env.EDGE_CONFIG_ID;
  if (process.env.EDGE_CONFIG) {
    try {
      const p = new URL(process.env.EDGE_CONFIG).pathname;
      return p.replace(/^\/+/, "");
    } catch (e) { return null; }
  }
  return null;
}
// 讀取網址：https://edge-config.vercel.com/{id}/items?token=xxx
function edgeReadUrl() {
  if (!process.env.EDGE_CONFIG) return null;
  try {
    const u = new URL(process.env.EDGE_CONFIG);
    return `${u.origin}/${edgeId()}/items${u.search}`;
  } catch (e) { return null; }
}
async function edgeRead() {
  const url = edgeReadUrl();
  if (!url) return null;
  const r = await fetch(url);
  const j = await r.json();
  // Edge Config items 可能直接是 { members: [...] } 或在 result 裡
  let v = j && (j[CFG_KEY] !== undefined ? j[CFG_KEY] : (j.result && j.result[CFG_KEY]));
  if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { v = null; } }
  return Array.isArray(v) ? v : null;
}
async function edgeWrite(arr) {
  const id = edgeId();
  const tok = process.env.VERCEL_API_TOKEN;
  if (!id || !tok) return { error: "缺少 EDGE_CONFIG 或 VERCEL_API_TOKEN" };
  const r = await fetch(`https://api.vercel.com/v1/edge-config/${id}/items`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${tok}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ operation: "upsert", key: CFG_KEY, value: arr }],
    }),
  });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch (e) { j = { raw: t }; }
  if (!r.ok) {
    return { error: `Vercel API ${r.status}: ${(j && (j.error && j.error.message || j.message)) || t}`.slice(0, 300) };
  }
  return { ok: true };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-admin-token");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  const redis = pickRedis();
  const hasEdge = !!edgeReadUrl();
  const token = process.env.VERCEL_API_TOKEN;

  if (!redis && !hasEdge) {
    res.status(200).json({
      __noKV: true,
      hint: "未偵測到資料庫。請於 Vercel Storage 建立 Redis 並 Connect Project；或使用 Global Config 並設 EDGE_CONFIG + VERCEL_API_TOKEN。",
      seen: Object.keys(process.env).filter((k) => /REST|REDIS|KV|UPSTASH|STORAGE|EDGE|VERCEL/i.test(k)),
    });
    return;
  }

  try {
    if (req.method === "GET") {
      // 優先 Redis
      if (redis) {
        const r = await fetch(`${redis.url}/get/${KEY}`, {
          headers: { Authorization: `Bearer ${redis.token}` },
        });
        const j = await r.json();
        let arr = null;
        if (typeof j.result === "string") { try { arr = JSON.parse(j.result); } catch (e) { arr = null; } }
        else if (Array.isArray(j.result)) arr = j.result;
        if (Array.isArray(arr) && arr.length) { res.status(200).json(arr); return; }
      }
      // 其次 Edge Config
      if (hasEdge) {
        const arr = await edgeRead();
        if (Array.isArray(arr)) { res.status(200).json(arr); return; }
      }
      res.status(200).json([]);
      return;
    }

    if (req.method === "POST") {
      if (req.headers["x-admin-token"] !== ADMIN_TOKEN) {
        res.status(401).json({ error: "unauthorized：token 不符，請確認 Vercel 環境變數 ADMIN_TOKEN 與後台通行碼相同" });
        return;
      }
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!Array.isArray(body)) { res.status(400).json({ error: "body 必須是陣列" }); return; }

      // Redis 優先
      if (redis) {
        await fetch(`${redis.url}/set/${KEY}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${redis.token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        res.status(200).json({ ok: true, via: "redis", count: body.length });
        return;
      }
      // Edge Conf
