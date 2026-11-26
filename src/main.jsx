import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { applyTheme, readTheme } from './lib/theme.js'

// Light, dark or the device's setting, before the first paint (the sign-in page included).
applyTheme(readTheme())

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
