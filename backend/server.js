const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Reader } = require('@maxmind/geoip2-node');
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');

const app = express();
const port = process.env.PORT || 3001;

// ---------------- CORS -----------------
app.use(cors());

// ---------------- File Upload Setup -----------------
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100 MB ZIP limit
});

// ---------------- Load GeoIP Database -----------------
let reader;
const dbPath = path.join(__dirname, "data", "GeoLite2-City.mmdb");

(async () => {
    try {
        if (!fs.existsSync(dbPath)) {
            console.error("❌ GeoIP database missing at:", dbPath);
            process.exit(1);
        }

        reader = await Reader.open(dbPath); // streaming, not buffer
        console.log("✅ GeoIP database loaded from:", dbPath);
    } catch (err) {
        console.error("❌ Failed loading GeoIP:", err.message);
        process.exit(1);
    }
})();

// ------------------- /lookup endpoint -------------------
app.post('/lookup', upload.single('zipFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No ZIP file uploaded." });
    }

    let results = [];
    let pending = 0;
    let finished = false;

    const finalize = () => {
        if (!finished || pending > 0) return;

        if (results.length === 0) {
            return res.status(400).json({
                error: "No valid public IP addresses found in the ZIP."
            });
        }

        res.json(results);
    };

    try {
        const zipStream = unzipper.Parse();

        zipStream.on("entry", entry => {
            const isJson = entry.path.toLowerCase().endsWith(".json");

            if (!isJson) {
                entry.autodrain();
                return;
            }

            pending++;

            entry
                .pipe(JSONStream.parse("*"))
                .on("data", row => {
                    if (!row.ip_addr) return;

                    const ip = row.ip_addr;

                    // Skip private networks
                    if (
                        ip.startsWith("192.168.") ||
                        ip.startsWith("10.") ||
                        ip.startsWith("172.16.")
                    ) {
                        return;
                    }

                    try {
                        const geo = reader.city(ip);

                        results.push({
                            ...row,
                            latitude: geo.location.latitude,
                            longitude: geo.location.longitude,
                            city: geo.city?.names?.en || null,
                            country: geo.country?.isoCode || null
                        });
                    } catch {
                        // ignore failed lookups
                    }
                })
                .on("end", () => {
                    pending--;
                    finalize();
                });
        });

        zipStream.on("close", () => {
            finished = true;
            finalize();
        });

        zipStream.on("error", err => {
            console.error("ZIP stream error:", err);
            return res.status(500).json({ error: err.message });
        });

        // Start streaming ZIP buffer
        zipStream.end(req.file.buffer);

    } catch (err) {
        console.error("SERVER ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------- Start Server -----------------
app.listen(port, () => {
    console.log(`🚀 Railway GeoIP server running on port ${port}`);
});
