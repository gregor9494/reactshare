'use client'; // Mark this component as a Client Component

import { SessionProvider } from 'next-auth/react';
import React from 'react';

// You can add other client-side providers here as needed (e.g., ThemeProvider, QueryClientProvider)
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* You could wrap children with other providers here */}
      {children}
    </SessionProvider>
  );
}