const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Reader = require('@maxmind/geoip2-node').Reader;
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip'); 

const app = express();
const port = 3001; 

// most of this was done by AI, we did not have too much knowledge of express servers, but my (Dahlia) experience with 
// my 390 final paid off a bit.
// --- Configuration and Initialization ---

// 1. CORS setup (Allows client on 5173 to connect to 3001)
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173' 
];
app.use(cors({ 
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); 
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Origin ${origin} not allowed by CORS`), false);
        }
    }
})); 

// 2. Multer setup: store the uploaded ZIP file in memory (max 100MB)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } 
}); 

// 3. Load the GeoIP database
let reader;
const dbPath = path.resolve(__dirname, 'data', 'GeoLite2-City.mmdb');

try {
    const dbBuffer = fs.readFileSync(dbPath);
    reader = Reader.openBuffer(dbBuffer);
    console.log("✅ GeoIP database loaded successfully.");
} catch (error) {
    console.error("❌ Failed to load GeoIP database. Check path and file existence:", error.message);
    process.exit(1); 
}

// --- The GeoIP Lookup Endpoint ---

app.post('/lookup', upload.single('zipFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Error: No ZIP file uploaded.');
    }
    
    try {
        const zip = new AdmZip(req.file.buffer);
        const zipEntries = zip.getEntries();
        let combinedData = [];

        // 1. Iterate through files and combine JSON content
        for (const entry of zipEntries) {
            const entryName = entry.entryName;
            
            // Filter for JSON files, ignoring directories and Mac metadata
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
        
        // --- 2. Perform GeoIP Lookup on Combined Data ---
        
        let validCount = 0;

        const geoData = combinedData
            // Use the correct Spotify column name: 'ip_addr'
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
            // Final filter for successful lookups
            .filter(data => data !== null && data.latitude && data.longitude);

        console.log(`Successfully found ${geoData.length} geolocatable points.`);

        if (geoData.length === 0) {
             return res.status(400).json({ 
                error: "File processed, but no valid, geolocatable IP addresses were found.", 
                details: `Out of ${combinedData.length} records, none matched a public GeoIP address.`
            });
        }

        // 3. Send the final geolocated array back to the client
        res.json(geoData);

    } catch (error) {
        console.error('SERVER FATAL ERROR:', error);
        res.status(500).send(`Internal Server Error: ${error.message}`);
    }
});

// --- Start the Server ---

app.listen(port, () => {
    console.log(`🚀 GeoIP Lookup Server running on http://localhost:${port}`);
});