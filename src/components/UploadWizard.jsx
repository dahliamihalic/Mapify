import { useContext, useState, useRef, useEffect } from "react";
import { DataContext } from '../contexts/DataContext';
import { NameContext } from '../contexts/NameContext';
import { ModeContext } from '../contexts/ModeContext';
import { useNavigate } from "react-router-dom";

const UploadWizard = () => {
    const { uploadAndGeolocate, isLoading, error, data } = useContext(DataContext);
    const { changeName } = useContext(NameContext);
    const { mode } = useContext(ModeContext);

    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [name, setName] = useState("");

    const nameRef = useRef(null);

    // Automatically focus name field once data is processed
    useEffect(() => {
        if (!isLoading && data.length > 0) {
            nameRef.current?.focus();
        }
    }, [isLoading, data]);

    const handleFileChange = async (e) => {
        const zip = e.target.files[0];
        setFile(zip);

        if (zip && zip.name.endsWith(".zip")) {
            await uploadAndGeolocate(zip);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        changeName(name.trim());
        navigate("/graph");
    };

    const step =
        !file
            ? 1 // Step 1: No file chosen yet
            : isLoading
            ? 2 // Step 2: Processing
            : data.length > 0
            ? 3 // Step 3: Ready for name entry
            : 1;

    return (
        <div style={{ textAlign: "center", marginTop: "40px" }}>

            {/* STEP TITLES */}
            {step === 1 && <h2>Step 1: Upload Your Spotify Extended Streaming History</h2>}
            {step === 2 && <h2>Step 2: Wait Just A Moment…</h2>}
            {step === 3 && <h2>Step 3: Enter Your Name</h2>}

            {/* STEP 1 — UPLOAD */}
            {step === 1 && (
                <>
                    <input
                        id="file-input"
                        type="file"
                        accept=".zip"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                    />

                    <button
                        onClick={() => document.getElementById("file-input").click()}
                        style={{
                            backgroundImage: `url('/${mode === 'light'
                                ? 'Light-Upload-Button.svg'
                                : 'dark-upload-buttom.svg'}')`,
                            backgroundSize: "contain",
                            backgroundRepeat: "no-repeat",
                            width: "350px",
                            height: "80px",
                            border: "none",
                            cursor: "pointer",
                            backgroundColor: "transparent"
                        }}
                    >
                        <span style={{ visibility: "hidden" }}>Upload</span>
                    </button>

                    {error && <p style={{ color: "red" }}>{error}</p>}
                </>
            )}

            {/* STEP 2 — PROCESSING */}
            {step === 2 && (
                <div style={{ marginTop: "20px" }}>
                    <p>Processing ZIP… this may take a moment.</p>

                    {/* Placeholder for your spinner */}
                    <div id="loading-wheel" style={{ marginTop: "10px"}}>
                        <img src={mode === 'light'
                                ? 'load-white.gif'
                                : 'loading-load.gif'} style={{maxWidth:"50px"}}></img>
                    </div>

                    {error && <p style={{ color: "red" }}>{error}</p>}
                </div>
            )}

            {/* STEP 3 — NAME INPUT */}
            {step === 3 && (
                <form
                    onSubmit={handleSubmit}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "15px",
                        marginTop: "20px"
                    }}
                >
                    <input
                        ref={nameRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ify Spot"
                        required
                        style={{
                            backgroundImage: `url('/${mode === 'light'
                                ? 'light-name-box.svg'
                                : 'dark-name-box.svg'}')`,
                            backgroundSize: "contain",
                            backgroundRepeat: "no-repeat",
                            width: "250px",
                            height: "50px",
                            border: "none",
                            paddingBottom: "10px",
                            backgroundColor: "transparent",
                            textAlign: "center",
                            fontSize: "16px",
                            color: mode === "light" ? "#040605" : "#f9fbfa",
                            outline: "none"
                        }}
                    />

                    <button
                        type="submit"
                        disabled={name.trim() === ""}
                        style={{
                            backgroundImage: `url('/${mode === 'light'
                                ? 'Light-Submit-Button.svg'
                                : 'dark-submit-button.svg'}')`,
                            backgroundSize: "contain",
                            backgroundRepeat: "no-repeat",
                            width: "120px",
                            height: "50px",
                            border: "none",
                            cursor: name.trim() === "" ? "not-allowed" : "pointer",
                            backgroundColor: "transparent"
                        }}
                    >
                        <span style={{ visibility: "hidden" }}>Submit</span>
                    </button>
                </form>
            )}
        </div>
    );
};

export default UploadWizard;
