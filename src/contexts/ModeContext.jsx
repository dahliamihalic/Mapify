import { createContext, useState, useContext } from "react";

export const ModeContext = createContext();

export const ModeProvider = ({ children }) => {

    const [mode, setMode] = useState(window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light'); //googled how to find out if browser is in light/dark mode
    const toggleMode = () => {
        setMode((prevMode) => prevMode === 'light' ? 'dark' : 'light');
    }
    return (
        <ModeContext.Provider value={{ mode, toggleMode }}>
            {children}
        </ModeContext.Provider>
    );
};

export function toggleMode() {
    setMode((prevMode) => prevMode === 'light' ? 'dark' : 'light');
}

export function useMode() {
    const context = useContext(ModeContext);
    if (context === undefined) {
        throw new Error("useMode must be used within a ModeProvider");
    }
    return context;
}