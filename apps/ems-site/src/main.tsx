// Entry point for the EMS site application.
//
// This file bootstraps the React application and mounts it into the DOM.  The
// core functionality of the rhythm trainer lives in separate packages under
// `packages/`.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root');

if (root) {
  const app = ReactDOM.createRoot(root);
  app.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}