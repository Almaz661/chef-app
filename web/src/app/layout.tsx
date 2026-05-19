import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/nav';

export const metadata: Metadata = {
  title: 'ШефДом',
  description: 'Домашний помощник по готовке — меню, рецепты, инвентарь',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
          {children}
        </main>
      </body>
    </html>
  );
}
