import { Reader } from '@maxmind/geoip2-node';
import path from 'path';

let reader;

// Lazy load DB once per serverless instance
function getReader() {
  if (reader) return reader;

  const dbPath = path.join(process.cwd(), '/api/GeoLite2-City.mmdb'); // Adjust path if in data/
  console.log('Opening GeoLite2 DB at:', dbPath);
  reader = Reader.open(dbPath);
  return reader;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse body
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { ips } = body;
    if (!Array.isArray(ips) || ips.length === 0) {
      return res.status(400).json({ error: 'No IPs provided' });
    }

    console.log('Incoming batch size:', ips.length);

    const reader = getReader();
    const results = [];

    for (const ip of ips) {
      // Skip private IPs
      if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.')) continue;

      try {
        const geo = reader.city(ip);
        results.push({
          ip,
          latitude: geo.location.latitude,
          longitude: geo.location.longitude,
          city: geo.city?.names?.en ?? null,
          country: geo.country?.isoCode ?? null,
        });
      } catch (err) {
        // Ignore failed lookups
        console.warn('Lookup failed for IP:', ip);
      }
    }

    res.status(200).json({ results, count: results.length });
  } catch (err) {
    console.error('GeoIP lookup error:', err);
    res.status(500).json({ error: 'GeoIP lookup failed' });
  }
}
