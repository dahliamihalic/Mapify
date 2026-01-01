import { createContext, useState } from "react";
import JSZip from "jszip";

export const DataContext = createContext({
  data: [],
  filteredData: [],
  uploadAndGeolocate: () => Promise.resolve(),
  isLoading: false,
  error: null,
  progress: { processed: 0, total: 0, failed: 0 },
});

export const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0, failed: 0 });

  const uploadAndGeolocate = async (zipFile, onProgress = null) => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress({ processed: 0, total: 0, failed: 0 });
      setData([]);
      setFilteredData([]);

      // 1️⃣ Parse ZIP
      const zip = await JSZip.loadAsync(zipFile);
      const ipsSet = new Set();

      for (const entry of Object.values(zip.files)) {
        if (entry.dir || !entry.name.toLowerCase().endsWith(".json") || entry.name.startsWith("__MACOSX")) continue;

        const text = await entry.async("text");
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) continue;

        for (const row of parsed) {
          if (row?.ip_addr) ipsSet.add(row.ip_addr);
        }
      }

      const ipList = Array.from(ipsSet);
      if (ipList.length === 0) throw new Error("No IPs found in ZIP");

      // 2️⃣ Batch upload
      const BATCH_SIZE = 2000;
      const geoResults = [];
      let totalFailed = 0;

      for (let i = 0; i < ipList.length; i += BATCH_SIZE) {
        const batch = ipList.slice(i, i + BATCH_SIZE);

        try {
          const res = await fetch("/api/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ips: batch }),
          });

          if (!res.ok) throw new Error(`Batch ${i}-${i + batch.length} failed`);

          const json = await res.json();
          geoResults.push(...json.results);

          // Count failed IPs in this batch
          totalFailed += batch.length - json.results.length;

        } catch (batchErr) {
          console.warn("Batch failed:", batchErr);
          totalFailed += batch.length; // All IPs in batch failed
        }

        // Update progress including failed
        setProgress({
          processed: Math.min(i + BATCH_SIZE, ipList.length),
          total: ipList.length,
          failed: totalFailed,
        });
        if (onProgress) onProgress(Math.min(i + BATCH_SIZE, ipList.length), ipList.length, totalFailed);
      }

      // 3️⃣ Update context
      setData(geoResults);
      setFilteredData(geoResults);

      if (geoResults.length === 0) {
        setError("No IPs could be geolocated");
      } else if (totalFailed > 0) {
        setError(`${totalFailed} IPs could not be geolocated, but ${geoResults.length} succeeded`);
      }
    } catch (err) {
      console.error("uploadAndGeolocate error:", err);
      setError(err.message);
      setData([]);
      setFilteredData([]);
      setProgress({ processed: 0, total: 0, failed: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DataContext.Provider
      value={{ data, filteredData, setFilteredData, uploadAndGeolocate, isLoading, error, progress }}
    >
      {children}
    </DataContext.Provider>
  );
};
