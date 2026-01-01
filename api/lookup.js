import { get } from '@vercel/blob';
import { Reader } from '@maxmind/geoip2-node';
import fs from 'fs';
import os from 'os';
import path from 'path';

let readerPromise;

async function getReader() {
  if (readerPromise) return readerPromise;

  readerPromise = (async () => {
    try {
      console.log("Fetching GeoLite2 blob...");
      const blob = await get('GeoLite2-City.mmdb');
      console.log("Blob fetched, converting to buffer...");
      const buffer = Buffer.from(await blob.arrayBuffer());

      const tmpPath = path.join(os.tmpdir(), 'GeoLite2-City.mmdb');
      console.log("Writing DB to temp path:", tmpPath);
      await fs.promises.writeFile(tmpPath, buffer);

      console.log("Opening GeoLite2 Reader...");
      const reader = Reader.open(tmpPath);
      console.log("Reader opened successfully!");
      return reader;
    } catch (err) {
      console.error("Failed to initialize GeoIP reader:", err);
      throw err;
    }
  })();

  return readerPromise;
}


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { ips } = body;
    if (!Array.isArray(ips) || ips.length === 0) return res.status(400).json({ error: 'No IPs provided' });

    console.log("Incoming batch size:", ips.length);
    console.log("First 5 IPs:", ips.slice(0, 5));

    const reader = await getReader();
    const results = [];

    for (const ip of ips) {
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
        console.warn("Lookup failed for IP:", ip);
      }
    }

    res.status(200).json({ results, count: results.length });
  } catch (err) {
    console.error('GeoIP lookup error:', err);
    res.status(500).json({ error: 'GeoIP lookup failed' });
  }
}
