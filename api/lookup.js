import { get } from '@vercel/blob';
import { Reader } from '@maxmind/geoip2-node';
import fs from 'fs';
import os from 'os';
import path from 'path';

let readerPromise;

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ips } = req.body;

    if (!Array.isArray(ips) || ips.length === 0) {
      return res.status(400).json({ error: 'No IPs provided' });
    }

    const reader = await getReader();
    const results = [];

    for (const ip of ips) {
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
        // ignore lookup failures
      }
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'GeoIP lookup failed' });
  }
}
