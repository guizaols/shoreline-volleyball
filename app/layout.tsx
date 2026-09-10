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
  title: 'Shoreline — Esportes de praia',
  manifest: '/manifest.webmanifest',
  appleWebApp: {capable:true,title:'Shoreline',statusBarStyle:'black-translucent'},
  icons: {icon:'/icons/icon-192.png',apple:'/icons/icon-192.png'},
  description: 'Escolha seu esporte de praia: vôlei em duplas ou Gol a Gol. Jogue sozinho ou convide um amigo.',
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
