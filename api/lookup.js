const multer = require('multer');
const Reader = require('@maxmind/geoip2-node').Reader;
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

// Initialize multer for file uploads in serverless environment
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
});

// Load GeoIP database
let reader;
const dbPath = path.resolve(__dirname, '../server/data', 'GeoLite2-City.mmdb');

try {
    const dbBuffer = fs.readFileSync(dbPath);
    reader = Reader.openBuffer(dbBuffer);
    console.log("✅ GeoIP database loaded successfully.");
} catch (error) {
    console.error("❌ Failed to load GeoIP database:", error.message);
}

// Helper function to run multer middleware
const runMiddleware = (req, res, fn) => {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
};

// Main serverless function handler
module.exports = async (req, res) => {
    // Set CORS headers
    const allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
        process.env.VERCEL_PRODUCTION_URL ? `https://${process.env.VERCEL_PRODUCTION_URL}` : null
    ].filter(Boolean);

    const origin = req.headers.origin;
    
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origin && origin.includes('vercel.app')) {
        // Allow all Vercel preview deployments
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Run multer middleware
        await runMiddleware(req, res, upload.single('zipFile'));

        if (!req.file) {
            return res.status(400).json({ error: 'No ZIP file uploaded.' });
        }

        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();
        let combinedData = [];

        // Iterate through files and combine JSON content
        for (const entry of zipEntries) {
            const entryName = entry.entryName;

            if (entryName.toLowerCase().endsWith('.json') && !entry.isDirectory && !entryName.startsWith('__MACOSX')) {
                const jsonBuffer = entry.getData();
                const jsonString = jsonBuffer.toString('utf8');

                let jsonArray = JSON.parse(jsonString);

                if (Array.isArray(jsonArray)) {
                    combinedData.push(...jsonArray);
                }
            }
        }

        console.log(`Received ZIP and combined ${combinedData.length} total records.`);

        if (combinedData.length === 0) {
            return res.status(400).json({
                error: "File processed, but no valid data could be extracted.",
                details: "Check that the ZIP contains JSON files and they are correctly formatted."
            });
        }

        // Perform GeoIP Lookup on Combined Data
        let validCount = 0;

        const geoData = combinedData
            .filter(row => row.ip_addr)
            .map(row => {
                const ip = row.ip_addr;

                try {
                    // Quick filter for private/local IPs before GeoIP lookup
                    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) {
                        return null;
                    }

                    const response = reader.city(ip);
                    validCount++;

                    return {
                        ...row,
                        latitude: response.location.latitude,
                        longitude: response.location.longitude,
                        city: response.city.names.en || null,
                        country: response.country.isoCode || null,
                    };
                } catch (e) {
                    return null;
                }
            })
            .filter(data => data !== null && data.latitude && data.longitude);

        console.log(`Successfully found ${geoData.length} geolocatable points.`);

        if (geoData.length === 0) {
            return res.status(400).json({
                error: "File processed, but no valid, geolocatable IP addresses were found.",
                details: `Out of ${combinedData.length} records, none matched a public GeoIP address.`
            });
        }

        // Send the final geolocated array back to the client
        res.status(200).json(geoData);

    } catch (error) {
        console.error('SERVER FATAL ERROR:', error);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
};
