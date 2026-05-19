'use client';

import { useEffect, useState } from 'react';
import { getInventory, InventoryItem } from '@/lib/api';

const LOCATION_LABELS: Record<string, { label: string; emoji: string }> = {
  FRIDGE: { label: 'Холодильник', emoji: '🧊' },
  FREEZER: { label: 'Морозилка', emoji: '❄️' },
  PANTRY: { label: 'Кладовка', emoji: '🏠' },
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInventory()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const grouped = Object.entries(LOCATION_LABELS).map(([key, meta]) => ({
    location: key,
    ...meta,
    items: items.filter((i) => i.location === key),
  }));

  if (loading) {
    return <p className="text-gray-400 text-center py-12">Загрузка...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Инвентарь</h1>

      {items.length === 0 ? (
        <p className="text-gray-400 text-center py-12">
          Инвентарь пуст. Отметьте товары купленными в shopping-list.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) =>
            g.items.length > 0 ? (
              <section key={g.location}>
                <h2 className="text-lg font-semibold mb-3">
                  {g.emoji} {g.label}{' '}
                  <span className="text-sm font-normal text-gray-400">({g.items.length})</span>
                </h2>
                <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
                  {g.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-800">{item.product.name}</span>
                        {item.expiresAt && (
                          <span className="ml-2 text-xs text-gray-400">
                            до {new Date(item.expiresAt).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {parseFloat(item.quantity)} {item.unit.name}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
