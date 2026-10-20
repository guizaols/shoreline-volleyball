import type { Metadata } from 'next';
import { Geist, Geist_Mono, Press_Start_2P, VT323 } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const arcade = Press_Start_2P({
  variable: '--font-arcade',
  weight: '400',
  subsets: ['latin'],
});

// Second pixel font from the approved design: names and small text, with full accent support (Press Start 2P draws "Ê" badly).
const arcadeText = VT323({
  variable: '--font-arcade-text',
  weight: '400',
  subsets: ['latin'],
});

export const viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#082f42'};

export const metadata: Metadata = {
  title: 'Shoreline — Esportes de praia',
  manifest: '/manifest.webmanifest',
  appleWebApp: {capable:true,title:'Shoreline',statusBarStyle:'black-translucent'},
  icons: {icon:'/icons/icon-192.png',apple:'/icons/icon-192.png'},
  description: 'Vôlei, futevôlei, beach tennis, beach soccer e Gol a Gol. Cinco esportes na mesma praia, no computador e celular.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${arcade.variable} ${arcadeText.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
