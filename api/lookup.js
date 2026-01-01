import path from 'path';
import { Reader } from '@maxmind/geoip2-node';
import fs from 'fs';

let readerPromise;

async function getReader() {
  if (readerPromise) return readerPromise;

  readerPromise = (async () => {
    // Correct path to your GeoLite2 database
    const dbPath = path.join(process.cwd(), 'public', 'data', 'GeoLite2-City.mmdb');

    // Open the database
    return Reader.open(dbPath);
  })();

  return readerPromise;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
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
        console.warn(`Lookup failed for IP: ${ip}`);
      }
    }

    res.status(200).json({ results, count: results.length });
  } catch (err) {
    console.error('GeoIP lookup error:', err);
    res.status(500).json({ error: 'GeoIP lookup failed' });
  }
}
