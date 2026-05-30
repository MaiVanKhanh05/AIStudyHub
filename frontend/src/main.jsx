<<<<<<< HEAD
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")).render(

    <App />

);
=======
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log("MAIN RUNNING");

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
>>>>>>> feature-document-list
