'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getShoppingList, markPurchased, ShoppingList, ShoppingListItem } from '@/lib/api';

function ShoppingContent() {
  const searchParams = useSearchParams();
  const listId = searchParams.get('listId');
  const [list, setList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadList = async () => {
    if (!listId) { setLoading(false); return; }
    try {
      const l = await getShoppingList(listId);
      setList(l);
    } catch {
      setList(null);
    }
    setLoading(false);
  };

  useEffect(() => { loadList(); }, [listId]);

  const handlePurchase = async (item: ShoppingListItem) => {
    if (!list) return;
    try {
      await markPurchased(list.id, item.id, { location: 'FRIDGE' });
      setMessage(`${item.product?.name ?? 'Товар'} — куплено! Добавлено в инвентарь.`);
      await loadList();
    } catch (e: any) {
      setMessage(`Ошибка: ${e.message}`);
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-center py-12">Загрузка...</p>;
  }

  if (!listId || !list) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Нет активного списка покупок</p>
        <p className="text-sm text-gray-400">Создайте список из меню: Меню → "Список покупок"</p>
      </div>
    );
  }

  const pending = list.items.filter((i) => !i.purchasedAt);
  const purchased = list.items.filter((i) => !!i.purchasedAt);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Список покупок</h1>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-green-400">✕</button>
        </div>
      )}

      {pending.length === 0 && purchased.length > 0 && (
        <div className="mb-4 p-4 bg-green-50 rounded-lg text-center">
          <p className="text-green-700 font-medium">Всё куплено! ✅</p>
          <p className="text-sm text-green-600 mt-1">Товары добавлены в инвентарь</p>
        </div>
      )}

      {/* Pending items */}
      {pending.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Нужно купить ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                <div>
                  <span className="font-medium text-gray-800">{item.product?.name ?? item.productId}</span>
                  <span className="ml-2 text-sm text-gray-500">
                    {parseFloat(item.quantity)} {item.unit?.name ?? item.unitId}
                  </span>
                </div>
                <button
                  onClick={() => handlePurchase(item)}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  ✓ Купила
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Purchased items */}
      {purchased.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">
            Куплено ({purchased.length})
          </h2>
          <div className="space-y-2">
            {purchased.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 opacity-60">
                <div>
                  <span className="line-through text-gray-500">{item.product?.name ?? item.productId}</span>
                  <span className="ml-2 text-sm text-gray-400">
                    {parseFloat(item.quantity)} {item.unit?.name ?? item.unitId}
                  </span>
                </div>
                <span className="text-green-500 text-sm">✓</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ShoppingPage() {
  return (
    <Suspense fallback={<p className="text-gray-400 text-center py-12">Загрузка...</p>}>
      <ShoppingContent />
    </Suspense>
  );
}
