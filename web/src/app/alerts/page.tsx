'use client';

import { useEffect, useState } from 'react';
import { getExpiringAlerts, ExpiringAlert } from '@/lib/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<ExpiringAlert[]>([]);
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getExpiringAlerts(days)
      .then(setAlerts)
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Сроки годности</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-gray-200 rounded px-3 py-1 text-sm"
        >
          <option value={1}>1 день</option>
          <option value={3}>3 дня</option>
          <option value={7}>7 дней</option>
          <option value={14}>14 дней</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">Загрузка...</p>
      ) : alerts.length === 0 ? (
        <p className="text-gray-400 text-center py-12">
          Нет продуктов с истекающим сроком — всё хорошо! ✅
        </p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                a.status === 'EXPIRED'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div>
                <span className="font-medium">{a.productName}</span>
                <span className="ml-2 text-xs text-gray-500 capitalize">{a.location.toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {parseFloat(a.quantity)} {a.baseUnitId}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.status === 'EXPIRED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {a.status === 'EXPIRED' ? 'Просрочено' : 'Скоро'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(a.expiresAt).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
