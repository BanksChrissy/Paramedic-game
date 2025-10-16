import React from 'react';

/**
 * The top level component for the EMS site.  At this early stage it simply
 * renders a placeholder message.  In future development this will be
 * replaced with the full rhythm trainer layout and routing.
 */
export function App(): JSX.Element {
  return (
    <main style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1>Paramedic Rhythm Trainer</h1>
      <p>
        This is a placeholder for the desktop‑first EMS learning portal. The
        real‑time rhythm trainer and associated components will be mounted
        here in future phases.
      </p>
    </main>
  );
}