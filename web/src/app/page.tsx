import Link from 'next/link';
import { getGroupCounts } from '@/lib/api';

const GROUP_LABELS: Record<string, { label: string; emoji: string }> = {
  BREAKFAST: { label: 'Завтраки', emoji: '🥐' },
  SOUP: { label: 'Супы', emoji: '🥣' },
  MAIN: { label: 'Основные', emoji: '🍖' },
  SALAD: { label: 'Салаты', emoji: '🥗' },
  BAKING: { label: 'Выпечка', emoji: '🧁' },
  DESSERT: { label: 'Десерты', emoji: '🍫' },
  DRINK: { label: 'Напитки', emoji: '🥤' },
  PREP: { label: 'Заготовки', emoji: '🫙' },
  UNGROUPED: { label: 'Без группы', emoji: '📋' },
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let groups: Array<{ group: string; count: number }> = [];
  try {
    groups = await getGroupCounts();
  } catch {
    // API not available — show placeholder
    groups = Object.keys(GROUP_LABELS).map((g) => ({ group: g, count: 0 }));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Рецепты</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {groups.map(({ group, count }) => {
          const info = GROUP_LABELS[group] ?? { label: group, emoji: '📋' };
          return (
            <Link
              key={group}
              href={`/recipes?group=${group}`}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/30 transition-all"
            >
              <span className="text-3xl mb-2">{info.emoji}</span>
              <span className="font-medium text-sm text-gray-800">{info.label}</span>
              <span className="text-xs text-gray-400 mt-1">
                {count} {count === 1 ? 'рецепт' : count < 5 ? 'рецепта' : 'рецептов'}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
