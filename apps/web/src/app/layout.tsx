import type { Metadata } from 'next';
import './globals.css';
import { presentationRuntime } from '@/lib/presentation-runtime';
import { PresentationContextProvider } from '@/components/presentation-context';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AETHER-DOM — Local workspace',
  description: 'A local creative studio for connected stories, editable scenes, reviewed changes and saved playback.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PresentationContextProvider workspace={presentationRuntime()?.workspace ?? null}>{children}</PresentationContextProvider></body></html>;
}
