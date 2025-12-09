import { useState, useContext } from 'react'
import HomePage from './pages/Homepage'
import './styles/global.css'
import { DataProvider } from './contexts/DataContext'
import { toggleMode, ModeContext } from './contexts/ModeContext'
import { HashRouter, Routes, Route } from 'react-router-dom'
import GraphPage from './pages/GraphPage'
import { NameProvider } from './contexts/NameContext'

function App() {
  const { mode, toggleMode } = useContext(ModeContext);

  return (
    <>
      <HashRouter>
        <DataProvider>
          <NameProvider>
            <main className={mode === "light" ? "light" : "dark"}>
              <button className="mode-button" onClick={toggleMode}>
                {mode === "light" ? "Light Mode" : "Dark Mode"}
              </button>

              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/graph" element={<GraphPage></GraphPage>} />
              </Routes>
            </main>
          </NameProvider>
        </DataProvider>
      </HashRouter>
    </>
  )
}

export default App
