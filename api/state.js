import { Redis } from "@upstash/redis";

// Works with either a direct Upstash setup or Vercel's Upstash/KV integration.
const url =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.REDIS_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

const KEY = "wedding:planner:demo";

export default async function handler(req, res) {
  if (!redis) {
    return res.status(500).json({
      error:
        "Geen database geconfigureerd. Stel UPSTASH_REDIS_REST_URL en UPSTASH_REDIS_REST_TOKEN in als Environment Variables in Vercel.",
    });
  }

  try {
    if (req.method === "GET") {
      const data = await redis.get(KEY); // @upstash/redis parses JSON automatically
      return res.status(200).json(data || null);
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
      if (!body || typeof body !== "object") {
        return res.status(400).json({ error: "Ongeldige payload" });
      }
      await redis.set(KEY, body);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Methode niet toegestaan" });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
