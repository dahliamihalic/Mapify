const multer = require('multer');
const Reader = require('@maxmind/geoip2-node').Reader;
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

module.exports.config = {
    api: {
        bodyParser: false
    }
};


// Initialize multer for file uploads in serverless environment
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }
});

// Load GeoIP database
let reader;

// Try multiple paths for the database (for local dev and Vercel deployment)
const possiblePaths = [
    path.resolve(__dirname, '../server/data', 'GeoLite2-City.mmdb'),    // Development
    path.resolve(__dirname, '../dist/server/data', 'GeoLite2-City.mmdb'), // Vercel
    path.resolve('/var/task/server/data', 'GeoLite2-City.mmdb'),          // Vercel Lambda
    path.join(process.cwd(), 'server/data', 'GeoLite2-City.mmdb')         // Fallback
];

let dbPath = null;
for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
        dbPath = p;
        break;
    }
}

try {
    if (!dbPath) {
        throw new Error(`GeoIP database not found. Checked paths: ${possiblePaths.join(', ')}`);
    }
    const dbBuffer = fs.readFileSync(dbPath);
    reader = Reader.openBuffer(dbBuffer);
    console.log("✅ GeoIP database loaded successfully from:", dbPath);
} catch (error) {
    console.error("❌ Failed to load GeoIP database:", error.message);
    console.error("Current working directory:", process.cwd());
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

// CORS middleware
function setCorsHeaders(req, res) {
    const origin = req.headers.origin || '*';
    
    // Always set these headers for Vercel
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
}

// Main serverless function handler
module.exports = async (req, res) => {
    // FIRST: Set CORS headers immediately
    setCorsHeaders(req, res);
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Origin:', req.headers.origin);
    console.log('Content-Type:', req.headers['content-type']);

    // Handle preflight (OPTIONS) requests BEFORE any other processing
    if (req.method === 'OPTIONS') {
        console.log('✅ Preflight request handled');
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        console.log('❌ Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        // Check if GeoIP database is loaded
        if (!reader) {
            console.error('❌ GeoIP database not loaded');
            return res.status(503).json({ 
                error: 'GeoIP database not available',
                details: 'The GeoIP database failed to load. Please try again later.'
            });
        }

        // Run multer middleware
        console.log('Running multer middleware...');
        await runMiddleware(req, res, upload.single('zipFile'));

        if (!req.file) {
            console.error('❌ No file uploaded');
            return res.status(400).json({ error: 'No ZIP file uploaded.' });
        }

        console.log(`✅ File received: ${req.file.originalname} (${req.file.size} bytes)`);

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

        console.log(`Combined ${combinedData.length} total records from ZIP`);

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

        console.log(`Successfully found ${geoData.length} geolocatable points`);

        if (geoData.length === 0) {
            return res.status(400).json({
                error: "File processed, but no valid, geolocatable IP addresses were found.",
                details: `Out of ${combinedData.length} records, none matched a public GeoIP address.`
            });
        }

        // Send the final geolocated array back to the client
        console.log('✅ Sending response with', geoData.length, 'geolocated records');
        res.status(200).json(geoData);

    } catch (error) {
        console.error('❌ SERVER ERROR:', error.message);
        console.error('Error stack:', error.stack);
        
        // Handle multer-specific errors
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ 
                error: 'File too large',
                details: 'Maximum file size is 100MB'
            });
        }
        
        // Handle other errors
        res.status(500).json({ 
            error: `Internal Server Error: ${error.message}`,
            details: 'Check server logs for more information'
        });
    }
};
