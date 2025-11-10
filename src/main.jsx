// src/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './fallback.css'; // <- fallback Tailwind-achtige CSS

const el = document.getElementById('root');
createRoot(el).render(<App />);

