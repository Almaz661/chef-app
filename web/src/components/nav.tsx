'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Рецепты' },
  { href: '/inventory', label: 'Инвентарь' },
  { href: '/alerts', label: 'Сроки' },
  { href: '/history', label: 'История' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto max-w-5xl px-4 h-14 flex items-center gap-6">
        <Link href="/" className="text-xl font-bold text-primary">
          🍳 ШефДом
        </Link>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`transition-colors hover:text-primary ${
                pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
                  ? 'text-primary font-medium'
                  : 'text-gray-600'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
