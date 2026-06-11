import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Perennial — living, citation-verified literature reviews',
  description:
    'A versioned survey whose every reference is verified to exist and every claim is pinned to a quoted span.',
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
