import React, { useContext, useState } from 'react';
import { DataContext } from '../contexts/DataContext'; // Assuming DataContext is in the same directory
import { ModeContext } from '../contexts/ModeContext';

const CsvUploader = () => {
    // 1. Access context properties for functions and status
    const { uploadAndGeolocate, isLoading, error, data } = useContext(DataContext);
    const { mode } = useContext(ModeContext);

    // State to hold the file selected by the user
    const [file, setFile] = useState(null);

    // Handler for when the user selects a file
    const handleFileChange = (event) => {
        // Set the file object from the input element
        setFile(event.target.files[0]);
    };

    // Handler for the upload button click
    const handleUpload = async () => {
        if (!file) return;

        // Call the context function to handle the server communication
        await uploadAndGeolocate(file);
    };

    // Handler for clicking the custom upload button
    const handleButtonClick = () => {
        document.getElementById('file-input').click();
    };

    return (
        <div style={{ padding: '20px', marginBottom: '20px' }}>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
                <input
                    id="file-input"
                    type="file"
                    // Set the input to only accept ZIP files
                    accept=".zip"
                    onChange={handleFileChange}
                    disabled={isLoading}
                    style={{ display: 'none' }}
                />

                <button
                    onClick={handleButtonClick}
                    disabled={isLoading}
                    className="upload-button"
                    style={{
                        backgroundImage: `url('/src/assets/artwork/${mode === 'light' ? 'Light-Upload-Button.svg' : 'dark-upload-buttom.svg'}')`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        width: '350px',
                        height: '80px',
                        border: 'none',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        backgroundColor: 'transparent'
                    }}
                >
                    <span style={{ visibility: 'hidden' }}>
                        {isLoading ? 'Processing ZIP...' : 'Upload'}
                    </span>
                </button>
            </div>

            {/* Status and Feedback Section */}
            <div style={{ marginTop: '15px' }}>
                {/* Display an error message if one exists */}
                {error && (
                    <p style={{ color: 'var(--error-color)', fontWeight: 'bold' }}>
                        Error: {error}
                    </p>
                )}

                {/* Display success message after processing */}
                {!isLoading && data.length > 0 && (
                    <p style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>
                        Success!
                    </p>
                )}

                {/* Display pending status */}
                {file && !isLoading && data.length === 0 && !error && (
                    <p>File selected: <strong>{file.name}</strong></p>
                )}
                
                {file && (
                    <button
                        onClick={handleUpload}
                        disabled={isLoading}
                        style={{
                            marginTop: '10px',
                            padding: '10px 15px',
                            backgroundColor: 'var(--DM-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? 'Processing ZIP...' : 'Process & Geolocate'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CsvUploader;