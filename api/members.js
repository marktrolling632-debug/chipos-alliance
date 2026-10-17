// Vercel Serverless Function: /api/members
// GET  讀取名錄（公開）
// POST 保存名錄（需 x-admin-token，對應 Vercel 環境變數 ADMIN_TOKEN，預設 chiptos）
// 儲存後端：Vercel KV（底層 Upstash REST），以內建 fetch 存取，不需任何 npm 套件

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const KEY = "chipos:members";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "chiptos";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-admin-token");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // KV 尚未設定：回傳標記，前台自動沿用內建名錄
  if (!KV_URL || !KV_TOKEN) {
    res.status(200).json({ __noKV: true });
    return;
  }

  try {
    if (req.method === "GET") {
      const r = await fetch(`${KV_URL}/get/${KEY}`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
      });
      const j = await r.json();
      let arr = null;
      if (typeof j.result === "string") {
        try { arr = JSON.parse(j.result); } catch (e) { arr = null; }
      } else if (Array.isArray(j.result)) {
        arr = j.result;
      }
      res.status(200).json(Array.isArray(arr) ? arr : []);
      return;
    }

    if (req.method === "POST") {
      const token = req.headers["x-admin-token"];
      if (token !== ADMIN_TOKEN) {
        res.status(401).json({ error: "unauthorized: token 不符" });
        return;
      }
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!Array.isArray(body)) {
        res.status(400).json({ error: "body 必須是陣列" });
        return;
      }
      await fetch(`${KV_URL}/set/${KEY}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      res.status(200).json({ ok: true, count: body.length });
      return;
    }

    res.status(405).end();
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
