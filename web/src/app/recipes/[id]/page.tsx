'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRecipe, getNutrition, getMenus, addRecipeToMenu, RecipeDetail, Nutrition, Menu } from '@/lib/api';

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [nutrition, setNutrition] = useState<Nutrition | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMessage, setAddMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getRecipe(id).catch(() => null),
      getNutrition(id).catch(() => null),
      getMenus().catch(() => []),
    ]).then(([r, n, m]) => {
      setRecipe(r);
      setNutrition(n);
      setMenus(m);
      setLoading(false);
    });
  }, [id]);

  const handleAddToMenu = async (menuId: string) => {
    if (!recipe) return;
    try {
      await addRecipeToMenu(menuId, recipe.id, recipe.servings);
      setAddMessage(`Добавлено в меню!`);
    } catch (e: any) {
      setAddMessage(`Ошибка: ${e.message}`);
    }
  };

  if (loading) {
    return <p className="text-gray-400 text-center py-12">Загрузка...</p>;
  }

  if (!recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Рецепт не найден</p>
        <Link href="/" className="text-primary hover:underline">← На главную</Link>
      </div>
    );
  }

  const isPrep = !!recipe.producesProductId;

  return (
    <div>
      <Link href={recipe.group ? `/recipes?group=${recipe.group}` : '/'} className="text-sm text-primary hover:underline">
        ← Назад
      </Link>

      <h1 className="text-2xl font-bold mt-3 mb-1">{recipe.title}</h1>
      {recipe.description && <p className="text-gray-500 mb-4">{recipe.description}</p>}

      <div className="flex flex-wrap gap-3 mb-6 text-sm">
        <span className="px-2 py-1 bg-gray-100 rounded">{recipe.servings} порц.</span>
        {recipe.group && (
          <span className="px-2 py-1 bg-blue-50 text-primary rounded">{recipe.group}</span>
        )}
        {isPrep && (
          <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">
            Заготовка → {recipe.prepYieldQuantity} {recipe.prepYieldUnitId}, {recipe.prepShelfLifeDays} дн.
          </span>
        )}
      </div>

      {/* Ingredients */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Ингредиенты</h2>
        <ul className="space-y-1">
          {recipe.ingredients.map((ing) => (
            <li key={ing.id} className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-800">{ing.product.name}</span>
              <span className="text-gray-500 text-sm">
                {parseFloat(ing.quantity)} {ing.unit.name}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Nutrition */}
      {nutrition && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">КБЖУ на порцию</h2>
          <div className="grid grid-cols-4 gap-3">
            <NutritionCard label="Ккал" value={nutrition.perServing.kcal} />
            <NutritionCard label="Белки" value={nutrition.perServing.protein} unit="г" />
            <NutritionCard label="Жиры" value={nutrition.perServing.fat} unit="г" />
            <NutritionCard label="Углеводы" value={nutrition.perServing.carbs} unit="г" />
          </div>
          {nutrition.incomplete && (
            <p className="text-xs text-amber-600 mt-2">
              * Данные неполные — не у всех продуктов указан КБЖУ
            </p>
          )}
        </section>
      )}

      {/* Add to menu */}
      <section className="mt-8 p-4 bg-blue-50 rounded-lg">
        {addMessage && (
          <div className="mb-3 p-2 bg-green-50 text-green-700 rounded text-sm">
            {addMessage}
            <button onClick={() => setAddMessage('')} className="ml-2 text-green-400">✕</button>
          </div>
        )}
        {menus.length > 0 ? (
          <div>
            <p className="text-sm text-gray-600 mb-2 font-medium">Добавить в меню:</p>
            <div className="flex flex-wrap gap-2">
              {menus.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleAddToMenu(m.id)}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  + {m.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Чтобы добавить рецепт, сначала создайте меню</p>
            <Link href="/menu" className="text-primary hover:underline text-sm">
              Перейти в Меню →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function NutritionCard({ label, value, unit = '' }: { label: string; value: number; unit?: string }) {
  return (
    <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
      <div className="text-lg font-bold text-gray-900">
        {Math.round(value)}{unit && <span className="text-sm font-normal text-gray-500"> {unit}</span>}
      </div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
