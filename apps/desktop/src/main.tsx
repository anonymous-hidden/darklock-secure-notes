/**
 * Darklock Desktop — Entry Point
 *
 * Same React app as web, but with Tauri-specific integrations
 * (filesystem, native menus, IPC commands).
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '../../../packages/ui/src/styles/index.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
