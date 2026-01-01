import { useContext, useState, useRef, useEffect } from "react";
import { DataContext } from "../contexts/DataContext";
import { NameContext } from "../contexts/NameContext";
import { ModeContext } from "../contexts/ModeContext";
import { useNavigate } from "react-router-dom";

const UploadWizard = () => {
  const { uploadAndGeolocate, isLoading, error, data, progress } = useContext(DataContext);
  const { changeName } = useContext(NameContext);
  const { mode } = useContext(ModeContext);
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    if (!isLoading && data.length > 0) nameRef.current?.focus();
  }, [isLoading, data]);

  const handleFileChange = async (e) => {
    const zip = e.target.files[0];
    setFile(zip);
    if (zip && zip.name.endsWith(".zip")) {
      await uploadAndGeolocate(zip, (processed, total) =>
        console.log(`Processed ${processed} / ${total} IPs`)
      );
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    changeName(name.trim());
    navigate("/graph");
  };

  const step = !file ? 1 : isLoading ? 2 : data.length > 0 ? 3 : 1;

  return (
    <div style={{ textAlign: "center", marginTop: 40 }}>
      {step === 1 && <h2>Step 1: Upload Your Spotify Extended Streaming History</h2>}
      {step === 2 && <h2>Step 2: Processing…</h2>}
      {step === 3 && <h2>Step 3: Enter Your Name</h2>}

      {step === 1 && (
        <>
          <input id="file-input" type="file" accept=".zip" onChange={handleFileChange} style={{ display: "none" }} />
          <button onClick={() => document.getElementById("file-input").click()} style={{
            width: 350, height: 80, border: "none", cursor: "pointer",
            backgroundImage: `url('/${mode === 'light' ? 'Light-Upload-Button.svg' : 'dark-upload-buttom.svg'}')`,
            backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundColor: "transparent"
          }}>
            <span style={{ visibility: "hidden" }}>Upload</span>
          </button>
          {error && <p style={{ color: "red" }}>{error}</p>}
        </>
      )}

      {step === 2 && (
        <div style={{ marginTop: 20 }}>
          <p>Processing ZIP…</p>
          <div id="loading-wheel" style={{ marginTop: 10 }}>
            <img src={mode === "light" ? "load-white.gif" : "loading-load.gif"} style={{ maxWidth: 50 }} />
          </div>
          {progress.total > 0 && <p>{`Processed ${progress.processed} / ${progress.total} rows`}</p>}
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 15, marginTop: 20 }}>
          <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ify Spot" required
            style={{
              width: 250, height: 25, border: "none", paddingBottom: 10, backgroundColor: "transparent",
              textAlign: "center", fontSize: 16, color: mode === "light" ? "#040605" : "#f9fbfa", outline: "none",
              backgroundImage: `url('/${mode === 'light' ? 'light-name-box.svg' : 'dark-name-box.svg'}')`,
              backgroundSize: "contain", backgroundRepeat: "no-repeat"
            }} />
          <button type="submit" disabled={name.trim() === ""}
            style={{
              width: 120, height: 50, border: "none",
              cursor: name.trim() === "" ? "not-allowed" : "pointer", backgroundColor: "transparent",
              backgroundImage: `url('/${mode === 'light' ? 'Light-Submit-Button.svg' : 'dark-submit-button.svg'}')`,
              backgroundSize: "contain", backgroundRepeat: "no-repeat"
            }}>
            <span style={{ visibility: "hidden" }}>Submit</span>
          </button>
        </form>
      )}
    </div>
  );
};

export default UploadWizard;
