'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCookingHistory, getCookingStats, HistoryItem } from '@/lib/api';

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{
    totalCooks: number;
    distinctRecipes: number;
    topRecipes: Array<{ recipeId: string; recipeTitle: string; count: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCookingHistory({ limit: 20 }).catch(() => ({ items: [], total: 0 })),
      getCookingStats(30).catch(() => null),
    ]).then(([hist, s]) => {
      setItems(hist.items);
      setTotal(hist.total);
      setStats(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p className="text-gray-400 text-center py-12">Загрузка...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">История готовки</h1>

      {/* Stats */}
      {stats && stats.totalCooks > 0 && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-100">
          <div className="flex gap-6 text-sm mb-3">
            <div>
              <span className="text-2xl font-bold text-primary">{stats.totalCooks}</span>
              <span className="ml-1 text-gray-500">готовок за 30 дн.</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-primary">{stats.distinctRecipes}</span>
              <span className="ml-1 text-gray-500">разных рецептов</span>
            </div>
          </div>
          {stats.topRecipes.length > 0 && (
            <div className="text-xs text-gray-500">
              Топ: {stats.topRecipes.map((r) => `${r.recipeTitle} (${r.count})`).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Feed */}
      {items.length === 0 ? (
        <p className="text-gray-400 text-center py-12">
          Ещё ничего не приготовлено. Добавьте рецепт в меню и нажмите «Приготовить».
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.menuRecipeId} className="p-4 bg-white rounded-lg border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    href={`/recipes/${item.recipeId}`}
                    className="font-medium text-gray-900 hover:text-primary"
                  >
                    {item.recipeTitle}
                  </Link>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.cookedServings} порц. • {item.menuName}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(item.cookedAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {item.consumed.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Израсходовано: {item.consumed.map((c) => `${c.productName} ${c.quantity} ${c.unitId}`).join(', ')}
                </div>
              )}
            </div>
          ))}
          {total > items.length && (
            <p className="text-center text-sm text-gray-400">
              Показано {items.length} из {total}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
