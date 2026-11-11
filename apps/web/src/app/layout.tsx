import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AETHER-DOM — Local workspace',
  description: 'A local, read-only view of the Neon Shogun creative document.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
