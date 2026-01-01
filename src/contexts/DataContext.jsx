import { createContext, useState, useCallback } from "react";
import axios from 'axios';
import JSZip from "jszip";

// Define the URL for your Node.js GeoIP server
// Detect if we're on Vercel or localhost
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const LOOKUP_URL = '/api/lookup';

console.log('Environment Info:', {
    isLocalhost,
    hostname: window.location.hostname,
    LOOKUP_URL,
    nodeEnv: import.meta.env.MODE
});

/**
 * 1. Define the Context and its shape
 */
export const DataContext = createContext({
    // The main array to hold the final geolocated data (lat, lon, etc.)
    data: [],
    // Data array used by components for filtering/visualization
    filteredData: [],
    // Function to initiate the upload and geolocate process
    uploadAndGeolocate: () => Promise.resolve(),
    // Status flags for UI feedback
    isLoading: false,
    error: null,
    // Note: You may want to add a setFilteredData function here if needed later
});

/**
 * 2. Define the Provider Component
 */
export const DataProvider = ({ children }) => {
    // State to hold the master array of geolocated IP records
    const [data, setData] = useState([]);
    // State to hold the array currently used by the map/charts (initially same as data)
    const [filteredData, setFilteredData] = useState([]);
    // Status for loading UI
    const [isLoading, setIsLoading] = useState(false);
    // Status for error display
    const [error, setError] = useState(null);

    /**
     * Handles the file upload to the server, receives the geolocated data, 
     * and updates the context state.
     * * @param {File} file The user-selected ZIP file object.
     */

    const uploadAndGeolocate = async (zipFile, onProgress = null) => {
        try {
            setIsLoading(true);
            setError(null);

            // 1️⃣ Parse ZIP in browser
            const zip = await JSZip.loadAsync(zipFile);
            const ipsSet = new Set();

            for (const entry of Object.values(zip.files)) {
                if (
                    entry.dir ||
                    !entry.name.toLowerCase().endsWith('.json') ||
                    entry.name.startsWith('__MACOSX')
                ) continue;

                const text = await entry.async('text');
                const parsed = JSON.parse(text);
                if (!Array.isArray(parsed)) continue;

                for (const row of parsed) {
                    if (row?.ip_addr) ipsSet.add(row.ip_addr);
                }
            }

            const ipList = Array.from(ipsSet);
            if (ipList.length === 0) throw new Error('No IPs found in ZIP');

            // 2️⃣ Batch upload
            const BATCH_SIZE = 2000;
            const geoResults = [];

            for (let i = 0; i < ipList.length; i += BATCH_SIZE) {
                const batch = ipList.slice(i, i + BATCH_SIZE);

                const res = await fetch('/api/lookup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ips: batch }),
                });

                if (!res.ok) {
                    throw new Error('GeoIP lookup failed');
                }

                const data = await res.json();
                geoResults.push(...data.results);

                // Progress callback
                if (onProgress) onProgress(Math.min(i + BATCH_SIZE, ipList.length), ipList.length);
            }

            // 3️⃣ Update context
            setData(geoResults);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };


    // The context value bundles all data and functions
    const contextValue = {
        data,
        filteredData,
        uploadAndGeolocate,
        isLoading,
        error
    };

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
};