// upload-geoip.js
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { put } from '@vercel/blob';

dotenv.config({
  path: path.resolve(process.cwd(), '.env.local'),
});

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error('❌ BLOB_READ_WRITE_TOKEN missing');
}

const mmdbPath = path.resolve(
  process.cwd(),
  'backend',
  'data',
  'GeoLite2-City.mmdb'
);

console.log('Uploading:', mmdbPath);

if (!fs.existsSync(mmdbPath)) {
  throw new Error('❌ GeoLite2-City.mmdb not found');
}

const stream = fs.createReadStream(mmdbPath);

await put('GeoLite2-City.mmdb', stream, {
  access: 'public',
  contentType: 'application/octet-stream',
});

console.log('✅ GeoIP database uploaded to Vercel Blob');
