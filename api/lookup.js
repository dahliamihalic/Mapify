import { get } from '@vercel/blob';
import { Reader } from '@maxmind/geoip2-node';
import fs from 'fs';
import os from 'os';
import path from 'path';

let readerPromise;

/**
 * Load GeoLite2 database once per cold start
 */
async function getReader() {
  if (readerPromise) return readerPromise;

  readerPromise = (async () => {
    const blob = await get('GeoLite2-City.mmdb');
    const buffer = Buffer.from(await blob.arrayBuffer());

    const tmpPath = path.join(os.tmpdir(), 'GeoLite2-City.mmdb');
    await fs.promises.writeFile(tmpPath, buffer);

    return Reader.open(tmpPath);
  })();

  return readerPromise;
}

/**
 * POST /api/lookup
 * Expects { ips: ["1.2.3.4", ...] }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;

    // Parse JSON if needed
    if (typeof body === 'string') body = JSON.parse(body);

    const { ips } = body;
    if (!Array.isArray(ips) || ips.length === 0) {
      return res.status(400).json({ error: 'No IPs provided' });
    }

    const reader = await getReader();
    const results = [];

    for (const ip of ips) {
      // Skip private IPs
      if (
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        ip.startsWith('172.16.')
      ) continue;

      try {
        const geo = reader.city(ip);
        results.push({
          ip,
          latitude: geo.location.latitude,
          longitude: geo.location.longitude,
          city: geo.city?.names?.en ?? null,
          country: geo.country?.isoCode ?? null,
        });
      } catch {
        // ignore invalid IPs
      }
    }

    res.status(200).json({ results, count: results.length });
  } catch (err) {
    console.error('GeoIP lookup error:', err);
    res.status(500).json({ error: 'GeoIP lookup failed' });
  }
}
