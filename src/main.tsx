import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

// wght.css = nur Variable-Weight, alle Unicode-Subsets (Browser laedt via unicode-range
// nur das tatsaechlich benoetigte woff2). Schlanker als der Default-Import von index.css,
// der zusaetzlich opsz- + standard-Varianten enthaelt. @fontsource-variable/inter exportiert
// keine subset-spezifischen CSS-Files (latin.css / latin-ext.css existieren nicht).
import '@fontsource-variable/inter/wght.css';
import './index.css';

import App from './App';
import { AuthProvider } from '@/lib/auth';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position="bottom-right" toastOptions={{ duration: 3500 }} />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
