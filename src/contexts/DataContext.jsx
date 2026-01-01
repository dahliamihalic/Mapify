import { createContext, useState } from "react";
import JSZip from "jszip";

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });

  const uploadAndGeolocate = async (file, onProgress) => {
    setIsLoading(true);
    setError(null);
    setData([]);
    setProgress({ processed: 0, total: 0 });

    try {
      const zip = await JSZip.loadAsync(file);
      const jsonFiles = Object.keys(zip.files).filter((f) => f.endsWith(".json"));
      const streamingData = [];

      // Extract all JSON files
      for (const fileName of jsonFiles) {
        const content = await zip.files[fileName].async("string");
        const json = JSON.parse(content);
        streamingData.push(...json);
      }

      setProgress({ processed: 0, total: streamingData.length });

      // Split into IP batches to avoid huge payloads
      const batchSize = 100;
      for (let i = 0; i < streamingData.length; i += batchSize) {
        const batch = streamingData.slice(i, i + batchSize);

        const ips = batch.map((item) => item.ip_addr).filter(Boolean);

        const res = await fetch("/api/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ips }),
        });

        if (!res.ok) throw new Error("GeoIP lookup failed");

        const geoData = await res.json(); // { results: [...] }
        const geoMap = {};
        geoData.results.forEach((g) => (geoMap[g.ip] = g));

        // Merge geo info back into batch
        const enriched = batch.map((item) => ({
          ...item,
          geo: geoMap[item.ip_addr] || null,
        }));

        streamingData.splice(i, batch.length, ...enriched);
        setProgress({ processed: Math.min(i + batchSize, streamingData.length), total: streamingData.length });
        if (onProgress) onProgress(Math.min(i + batchSize, streamingData.length), streamingData.length);
      }

      setData(streamingData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DataContext.Provider value={{ data, isLoading, error, progress, uploadAndGeolocate }}>
      {children}
    </DataContext.Provider>
  );
};
