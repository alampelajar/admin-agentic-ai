import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Light or dark from the last choice, else from the device, before the first paint
// (the sign-in page included).
const savedTheme = localStorage.getItem('admin_theme')
document.documentElement.classList.toggle(
  'dark',
  savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches,
)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
