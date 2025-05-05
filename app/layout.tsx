import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers'; // Import the Providers component

export const metadata: Metadata = {
  title: 'ReactShare', // Updated title
  description: 'Create, edit, and distribute reaction videos seamlessly.', // Updated description
  // generator: 'v0.dev', // Optional: remove or keep
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning> {/* suppressHydrationWarning often helpful with providers */}
      <body> {/* Ensure body starts immediately after html or on the next line */}
        <Providers> {/* Wrap children with the Providers component */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
