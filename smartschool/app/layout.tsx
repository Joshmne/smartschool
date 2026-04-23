// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title:       'SmartSchool – Revenue-Protected School OS',
  description: 'Offline-first school management with Result Gate fee recovery',
  manifest:    '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SmartSchool' },
};

export const viewport: Viewport = {
  width:                'device-width',
  initialScale:         1,
  maximumScale:         1,
  userScalable:         false,
  themeColor:           '#4B5563',
  viewportFit:          'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-surface overscroll-none">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
