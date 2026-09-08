import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#082f42'};

export const metadata: Metadata = {
  title: 'Shoreline — Beach Volley',
  manifest: '/manifest.webmanifest',
  appleWebApp: {capable:true,title:'Shoreline',statusBarStyle:'black-translucent'},
  icons: {icon:'/icons/icon-192.png',apple:'/icons/icon-192.png'},
  description: 'Leave your shoes. Bring your game. Play beach volleyball against Coast with keyboard or touch controls.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
