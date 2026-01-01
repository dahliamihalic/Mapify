import { createContext, useState } from "react";
import JSZip from "jszip";

export const DataContext = createContext({
  data: [],
  filteredData: [],
  uploadAndGeolocate: () => Promise.resolve(),
  isLoading: false,
  error: null,
  progress: { processed: 0, total: 0 },
});

export const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });

  /**
   * Upload ZIP and geolocate in safe batches.
   */
  const uploadAndGeolocate = async (zipFile, onProgress = null) => {
    try {
      setIsLoading(true);
      setError(null);
      setProgress({ processed: 0, total: 0 });

      // 1️⃣ Parse ZIP
      const zip = await JSZip.loadAsync(zipFile);
      const ipsSet = new Set();

      for (const entry of Object.values(zip.files)) {
        if (entry.dir || !entry.name.toLowerCase().endsWith(".json") || entry.name.startsWith("__MACOSX"))
          continue;

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

      for (let i = 0; i < ipList.length; i += BATCH_SIZE) {
        const batch = ipList.slice(i, i + BATCH_SIZE);

        const res = await fetch("/api/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ips: batch }),
        });

        if (!res.ok) {
          console.error(`Batch failed: ${i} to ${i + batch.length}`);
          throw new Error("GeoIP lookup failed");
        }

        const data = await res.json();
        geoResults.push(...data.results);

        // Update progress
        setProgress({ processed: Math.min(i + BATCH_SIZE, ipList.length), total: ipList.length });
        if (onProgress) onProgress(Math.min(i + BATCH_SIZE, ipList.length), ipList.length);
      }

      // 3️⃣ Update context
      setData(geoResults);
      setFilteredData(geoResults);
    } catch (err) {
      console.error(err);
      setError(err.message);
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
