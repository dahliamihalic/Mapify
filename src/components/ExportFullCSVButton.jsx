import React, { useContext } from "react";
import { DataContext } from "../contexts/DataContext";
const ExportFullCSVButton = () => {
  const { data } = useContext(DataContext);

  const downloadCSV = () => {
    if (!data || data.length === 0) return;

    // 1. Get all keys dynamically from the first object
    const allKeys = Array.from(
      new Set(data.flatMap(d => Object.keys(d)))
    );

    // 2. Clean data: replace null/undefined with "Unknown"
    const cleaned = data.map(d =>
      allKeys.reduce((acc, key) => {
        acc[key] = d[key] ?? "Unknown";
        return acc;
      }, {})
    );

    // 3. Convert to CSV
    const csvRows = [
      allKeys.join(","), // header
      ...cleaned.map(row =>
        allKeys
          .map(field => `"${String(row[field]).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    const csvString = csvRows.join("\n");

    // 4. Trigger download
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spotify_full_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={downloadCSV}
      style={{
        padding: "10px 20px",
        margin: "20px 0",
        cursor: "pointer",
      }}
    >
      Download Full CSV
    </button>
  );
};

export default ExportFullCSVButton;
