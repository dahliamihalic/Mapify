import fs from "fs";
import path from "path";
import { Reader } from "@maxmind/geoip2-node";

let reader;

async function getReader() {
  if (!reader) {
    const dbPath = path.join(process.cwd(), "public", "data", "GeoLite2-City.mmdb");
    if (!fs.existsSync(dbPath)) throw new Error("GeoLite2 DB not found at " + dbPath);
    reader = await Reader.open(dbPath);
    console.log("GeoLite2 DB opened at:", dbPath);
  }
  return reader;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    const { ips } = body;
    if (!Array.isArray(ips) || ips.length === 0) return res.status(400).json({ error: "No IPs provided" });

    const geoReader = await getReader();
    const results = [];

    for (const ip of ips) {
      try {
        // Skip private IPs
        if (/^(10\.|192\.168\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[0-1]\.)/.test(ip)) continue;
        const geo = geoReader.city(ip);
        results.push({
          ip,
          city: geo.city?.names?.en || null,
          region: geo.subdivisions?.[0]?.names?.en || null,
          country: geo.country?.isoCode || null,
          lat: geo.location.latitude || null,
          lon: geo.location.longitude || null,
        });
      } catch {
        results.push({ ip, city: null, region: null, country: null, lat: null, lon: null });
      }
    }

    res.status(200).json({ results, count: results.length });
  } catch (err) {
    console.error("GeoIP lookup error:", err);
    res.status(500).json({ error: "GeoIP lookup failed" });
  }
}
