import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { NameContext } from '../contexts/NameContext';
import { ModeContext } from '../contexts/ModeContext';


const InfoForm = () => {
    const { uName, changeName } = useContext(NameContext);
    const { mode } = useContext(ModeContext);
    const [data, setData] = useState({ name: "" });
    const navigate = useNavigate();
    const nameRef = useRef(null);

    useEffect(() => {
        nameRef.current.focus();
    }, []);

    const handleChange = (e) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        changeName(data.name.trim());
        console.log("name is " + data.name.trim());
        setTimeout(() => {
            navigate("/graph");
        }, 0);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>
            <input
                type="text"
                name="name"
                ref={nameRef}
                value={data.name}
                placeholder="Enter Your Name:"
                onChange={handleChange}
                required
                style={{
                    backgroundImage: `url('/src/assets/artwork/${mode === 'light' ? 'light-name-box.svg' : 'dark-name-box.svg'}')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    width: '250px',
                    height: '50px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'center',
                    fontSize: '16px',
                    outline: 'none',
                    color: mode === 'light' ? '#040605' : '#f9fbfa'
                }}
            />
            <button 
                type="submit" 
                disabled={data.name.trim() === ""}
                style={{
                    backgroundImage: `url('/src/assets/artwork/${mode === 'light' ? 'Light-Submit-Button.svg' : 'dark-submit-button.svg'}')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    width: '120px',
                    height: '50px',
                    border: 'none',
                    cursor: data.name.trim() === "" ? 'not-allowed' : 'pointer',
                    backgroundColor: 'transparent'
                }}
            >
                <span style={{ visibility: 'hidden' }}>Submit</span>
            </button>
        </form>
    );
};


export default InfoForm;