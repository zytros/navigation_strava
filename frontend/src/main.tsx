/**
 * @file main.tsx
 * @description Application entry point that mounts the root React component (App) into the DOM with strict mode enabled.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * Renders the root App component into the HTML DOM root element.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

