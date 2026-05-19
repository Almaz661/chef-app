'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getMenus,
  getMenu,
  createMenu,
  cookMenuRecipe,
  generateShoppingList,
  Menu,
  MenuRecipeItem,
} from '@/lib/api';

export default function MenuPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [activeMenu, setActiveMenu] = useState<(Menu & { recipes: MenuRecipeItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMenuName, setNewMenuName] = useState('');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const loadMenus = async () => {
    setLoading(true);
    try {
      const list = await getMenus();
      setMenus(list);
      if (list.length > 0) {
        const full = await getMenu(list[0].id);
        setActiveMenu(full);
      }
    } catch {
      setMenus([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadMenus(); }, []);

  const handleCreate = async () => {
    if (!newMenuName.trim()) return;
    setCreating(true);
    try {
      const m = await createMenu(newMenuName.trim());
      setNewMenuName('');
      setMessage(`Меню "${m.name}" создано!`);
      await loadMenus();
    } catch (e: any) {
      setMessage(`Ошибка: ${e.message}`);
    }
    setCreating(false);
  };

  const handleCook = async (menuRecipeId: string) => {
    try {
      const result = await cookMenuRecipe(menuRecipeId);
      setMessage(`Приготовлено! ${result.produced ? `Заготовка создана: ${result.produced.quantity} ${result.produced.unitId}` : ''}`);
      if (activeMenu) {
        const full = await getMenu(activeMenu.id);
        setActiveMenu(full);
      }
    } catch (e: any) {
      setMessage(`Ошибка: ${e.message}`);
    }
  };

  const handleGenerateShopping = async () => {
    if (!activeMenu) return;
    try {
      const list = await generateShoppingList(activeMenu.id);
      setMessage(`Список покупок создан (${list.items.length} позиций)`);
      // Navigate to shopping page
      window.location.href = `/shopping?listId=${list.id}`;
    } catch (e: any) {
      setMessage(`Ошибка: ${e.message}`);
    }
  };

  const selectMenu = async (id: string) => {
    try {
      const full = await getMenu(id);
      setActiveMenu(full);
    } catch {}
  };

  if (loading) {
    return <p className="text-gray-400 text-center py-12">Загрузка...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Меню</h1>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
          {message}
          <button onClick={() => setMessage('')} className="ml-2 text-blue-400">✕</button>
        </div>
      )}

      {/* Create menu */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Название нового меню..."
          value={newMenuName}
          onChange={(e) => setNewMenuName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newMenuName.trim()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Создать
        </button>
      </div>

      {/* Menu tabs */}
      {menus.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {menus.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMenu(m.id)}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeMenu?.id === m.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Active menu content */}
      {activeMenu ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{activeMenu.name}</h2>
            <button
              onClick={handleGenerateShopping}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors"
            >
              🛒 Список покупок
            </button>
          </div>

          {activeMenu.recipes.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500 mb-2">Меню пустое</p>
              <Link href="/" className="text-primary hover:underline text-sm">
                Перейти к рецептам →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMenu.recipes.map((mr) => (
                <div key={mr.id} className="p-4 bg-white rounded-lg border border-gray-100 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/recipes/${mr.recipeId}`}
                      className="font-medium text-gray-900 hover:text-primary"
                    >
                      {mr.recipe?.title ?? 'Рецепт'}
                    </Link>
                    <p className="text-xs text-gray-400 mt-1">
                      {mr.servings} порц.
                      {mr.cookedAt && <span className="ml-2 text-green-600">✓ Приготовлено</span>}
                    </p>
                  </div>
                  {!mr.cookedAt && (
                    <button
                      onClick={() => handleCook(mr.id)}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                    >
                      🍳 Готовить
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-8">
          Создайте первое меню, чтобы начать планировать готовку
        </p>
      )}
    </div>
  );
}
