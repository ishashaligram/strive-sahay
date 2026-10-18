import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import {PageErrorBoundary} from './components/PageErrorBoundary';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <PageErrorBoundary><BrowserRouter>
    <App />
  </BrowserRouter></PageErrorBoundary>
);
