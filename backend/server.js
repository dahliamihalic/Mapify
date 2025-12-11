const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Reader = require('@maxmind/geoip2-node').Reader;
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

const app = express();
const port = process.env.PORT || 3001;

// ---------------- CORS -----------------
app.use(cors()); 
// (You can lock this down later once deployed)

// ---------------- File Upload Setup -----------------
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }  // 100 MB ZIP limit
});

// ---------------- Load GeoIP Database -----------------
let reader;
const dbPath = path.join(__dirname, "data", "GeoLite2-City.mmdb");

try {
    if (!fs.existsSync(dbPath)) {
        console.error("❌ GeoIP database missing at:", dbPath);
        process.exit(1);
    }

    const dbBuffer = fs.readFileSync(dbPath);
    reader = Reader.openBuffer(dbBuffer);
    console.log("✅ GeoIP database loaded from:", dbPath);
} catch (err) {
    console.error("❌ Failed loading GeoIP:", err.message);
    process.exit(1);
}

// ------------------- /lookup endpoint -------------------

app.post('/lookup', upload.single('zipFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No ZIP file uploaded." });
    }

    try {
        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();
        let combinedData = [];

        // Read all JSON files inside the ZIP
        for (const entry of entries) {
            if (
                entry.entryName.toLowerCase().endsWith('.json') &&
                !entry.isDirectory &&
                !entry.entryName.startsWith('__MACOSX')
            ) {
                const content = entry.getData().toString('utf8');
                const parsed = JSON.parse(content);

                if (Array.isArray(parsed)) {
                    combinedData.push(...parsed);
                }
            }
        }

        if (combinedData.length === 0) {
            return res.status(400).json({
                error: "ZIP loaded, but no JSON array content found."
            });
        }

        // Perform GeoIP lookups
        const result = combinedData
            .filter(row => row.ip_addr)
            .map(row => {
                const ip = row.ip_addr;

                // Skip private networks
                if (
                    ip.startsWith("192.168.") ||
                    ip.startsWith("10.") ||
                    ip.startsWith("172.16.")
                ) {
                    return null;
                }

                try {
                    const data = reader.city(ip);
                    return {
                        ...row,
                        latitude: data.location.latitude,
                        longitude: data.location.longitude,
                        city: data.city?.names?.en || null,
                        country: data.country?.isoCode || null,
                    };
                } catch {
                    return null;
                }
            })
            .filter(Boolean);

        if (result.length === 0) {
            return res.status(400).json({
                error: "No valid public IP addresses found in the ZIP."
            });
        }

        res.json(result);

    } catch (err) {
        console.error("SERVER ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------- Start Server -----------------
app.listen(port, () => {
    console.log(`🚀 Railway GeoIP server running on port ${port}`);
});
