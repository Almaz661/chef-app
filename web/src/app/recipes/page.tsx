'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRecipes, RecipeSummary } from '@/lib/api';

const GROUP_LABELS: Record<string, string> = {
  BREAKFAST: 'Завтраки',
  SOUP: 'Супы',
  MAIN: 'Основные блюда',
  SALAD: 'Салаты',
  BAKING: 'Выпечка',
  DESSERT: 'Десерты',
  DRINK: 'Напитки',
  PREP: 'Заготовки',
  UNGROUPED: 'Без группы',
};

export default function RecipesPage() {
  const searchParams = useSearchParams();
  const group = searchParams.get('group') ?? undefined;
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    getRecipes(group, search || undefined)
      .then(setRecipes)
      .catch(() => setRecipes([]))
      .finally(() => setLoading(false));
  }, [group, search]);

  const title = group ? GROUP_LABELS[group] ?? group : 'Все рецепты';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Все группы
        </Link>
      </div>

      <input
        type="text"
        placeholder="Поиск по названию..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-4 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      {loading ? (
        <p className="text-gray-400 text-center py-12">Загрузка...</p>
      ) : recipes.length === 0 ? (
        <p className="text-gray-400 text-center py-12">Рецептов не найдено</p>
      ) : (
        <div className="grid gap-3">
          {recipes.map((r) => (
            <Link
              key={r.id}
              href={`/recipes/${r.id}`}
              className="block p-4 bg-white rounded-lg border border-gray-100 hover:shadow-sm hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-medium text-gray-900">{r.title}</h2>
                  {r.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                  {r.servings} порц.
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
