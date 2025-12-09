import { createContext, useState, useCallback } from "react";
import axios from 'axios';

// Define the URL for your Node.js GeoIP server
// Use relative URL in production (Vercel), localhost in development
const LOOKUP_URL = import.meta.env.PROD 
    ? '/api/lookup' 
    : 'http://localhost:3001/lookup'; 

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
    const uploadAndGeolocate = useCallback(async (file) => {
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setData([]); // Clear previous data immediately
        setFilteredData([]);

        try {
            const formData = new FormData();
            // Key must match the server's multer configuration: upload.single('zipFile')
            formData.append('zipFile', file); 

            // Send the ZIP file to the Node.js server
            const response = await axios.post(LOOKUP_URL, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                // Set a timeout for large file processing
                timeout: 600000 // 10 minutes
            });
            
            // The response.data is the array of geolocated objects
            const geolocatedData = response.data;

            if (geolocatedData.length === 0) {
                setError("File processed, but no valid, geolocatable IP addresses were found.");
            }

            // Update state with the new data
            setData(geolocatedData);
            setFilteredData(geolocatedData); 
            
            return geolocatedData;

        } catch (err) {
            console.error("GeoIP Lookup Error:", err.message);
            console.error("Full error details:", err);
            let errorMessage = "An unknown error occurred during server processing.";
            
            if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.status === 403) {
                errorMessage = "Access Forbidden (403) - CORS or authentication issue";
            } else if (err.response?.status === 500) {
                errorMessage = `Server Error: ${err.response.data?.error || err.message}`;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array means this function is created once

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