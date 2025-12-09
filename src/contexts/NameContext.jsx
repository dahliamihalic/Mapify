import { createContext, useState, useContext } from "react";

export const NameContext = createContext();

export const NameProvider = ({ children }) => {
    const [uName, setName] = useState('');

    const changeName = (newName) => {
        setName(newName);
    };

    return (
        <NameContext.Provider value={{ uName, changeName }}>
            {children}
        </NameContext.Provider>
    );
};
