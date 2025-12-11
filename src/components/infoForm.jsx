const InfoForm = () => {
    const { uName, changeName } = useContext(NameContext);
    const { mode } = useContext(ModeContext);

    // 🔥 ADD this:
    const { isLoading, data } = useContext(DataContext);

    const [name, setName] = useState("");
    const navigate = useNavigate();
    const nameRef = useRef(null);

    useEffect(() => {
        if (!isLoading && data.length > 0) {
            nameRef.current?.focus();
        }
    }, [isLoading, data]);

    const handleSubmit = (e) => {
        e.preventDefault();
        changeName(name.trim());
        navigate("/graph");
    };

    const processingNotDone = isLoading || data.length === 0;

    return (
        <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}
        >
            <input
                type="text"
                ref={nameRef}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={processingNotDone ? "Waiting for processing…" : "Enter Your Name:"}
                disabled={processingNotDone}
                style={{
                    backgroundImage: `url('/${mode === 'light' ? 'light-name-box.svg' : 'dark-name-box.svg'}')`,
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
                    color: mode === 'light' ? '#040605' : '#f9fbfa',
                    opacity: processingNotDone ? 0.5 : 1
                }}
            />

            <button
                type="submit"
                disabled={processingNotDone || name.trim() === ""}
                style={{
                    backgroundImage: `url('/${mode === 'light'
                        ? 'Light-Submit-Button.svg'
                        : 'dark-submit-button.svg'}')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    width: '120px',
                    height: '50px',
                    border: 'none',
                    cursor: processingNotDone || name.trim() === "" ? 'not-allowed' : 'pointer',
                    backgroundColor: 'transparent',
                    opacity: processingNotDone ? 0.5 : 1
                }}
            >
                <span style={{ visibility: 'hidden' }}>Submit</span>
            </button>
        </form>
    );
};
