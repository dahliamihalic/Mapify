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
      const jsonFiles = Object.keys(zip.files).filter(f => f.endsWith(".json"));
      const streamingData = [];

      for (const fileName of jsonFiles) {
        const content = await zip.files[fileName].async("string");
        const json = JSON.parse(content);

        const sdata = json.filter(item =>
          item.audiobook_title === null &&
          item.audiobook_uri === null &&
          item.audiobook_chapter_uri === null
        );

        streamingData.push(...sdata);
      }

      setProgress({ processed: 0, total: streamingData.length });

      const batchSize = 1000;

      for (let i = 0; i < streamingData.length; i += batchSize) {
        const batch = streamingData.slice(i, i + batchSize);
        const ips = batch.map(item => item.ip_addr).filter(Boolean);

        const res = await fetch("/api/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ips }),
        });

        if (!res.ok) throw new Error("GeoIP lookup failed");

        const geoData = await res.json();
        const geoMap = {};
        geoData.results.forEach(g => (geoMap[g.ip] = g));

        const enriched = batch.map(item => ({
          ...item,
          geo: geoMap[item.ip_addr] || null,
        }));

        streamingData.splice(i, batch.length, ...enriched);

        const processed = Math.min(i + batchSize, streamingData.length);
        setProgress({ processed, total: streamingData.length });
        onProgress?.(processed, streamingData.length);
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
