/**
 * Thin typed API client for the ШефДом NestJS backend.
 * All requests go through the Next.js rewrite (/api/...) to avoid CORS.
 */

const BASE = '/api';

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ---------- Types ----------

export interface GroupCount {
  group: string;
  count: number;
}

export interface RecipeSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  servings: number;
  group: string | null;
  updatedAt: string;
}

export interface Ingredient {
  id: string;
  quantity: string;
  rawText: string | null;
  note: string | null;
  product: { id: string; name: string; slug: string };
  unit: { id: string; name: string };
}

export interface RecipeDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  servings: number;
  group: string | null;
  producesProductId: string | null;
  prepYieldQuantity: string | null;
  prepYieldUnitId: string | null;
  prepDefaultLocation: string | null;
  prepShelfLifeDays: number | null;
  ingredients: Ingredient[];
}

export interface Nutrition {
  servings: number;
  total: NutritionValues;
  perServing: NutritionValues;
  incomplete: boolean;
  errors: string[];
}

export interface NutritionValues {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface InventoryItem {
  id: string;
  productId: string;
  product: { id: string; name: string; slug: string };
  quantity: string;
  unit: { id: string; name: string };
  location: string;
  expiresAt: string | null;
  acquiredAt: string;
}

export interface ExpiringAlert {
  id: string;
  productId: string;
  productName: string;
  location: string;
  quantity: string;
  baseUnitId: string;
  expiresAt: string;
  status: 'EXPIRED' | 'SOON';
}

export interface HistoryItem {
  menuRecipeId: string;
  menuId: string;
  menuName: string;
  recipeId: string;
  recipeSlug: string;
  recipeTitle: string;
  recipeServings: number;
  cookedServings: number;
  cookedAt: string;
  consumed: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitId: string;
  }>;
}

export interface CookResult {
  menuRecipeId: string;
  cookedAt: string;
  consumed: Array<{
    productId: string;
    baseUnitId: string;
    quantity: number;
  }>;
  produced?: {
    productId: string;
    inventoryItemId: string;
    quantity: number;
    unitId: string;
    location: string;
    expiresAt: string;
  };
}

// ---------- Recipes ----------

export function getGroupCounts(): Promise<GroupCount[]> {
  return fetchJson('/recipes/groups');
}

export function getRecipes(group?: string, search?: string): Promise<RecipeSummary[]> {
  const params = new URLSearchParams();
  if (group) params.set('group', group);
  if (search) params.set('search', search);
  const qs = params.toString();
  return fetchJson(`/recipes${qs ? `?${qs}` : ''}`);
}

export function getRecipe(id: string): Promise<RecipeDetail> {
  return fetchJson(`/recipes/${id}`);
}

export function getNutrition(recipeId: string): Promise<Nutrition> {
  return fetchJson(`/recipes/${recipeId}/nutrition`);
}

// ---------- Cooking ----------

export function cookMenuRecipe(
  menuRecipeId: string,
  preferLocation?: string,
): Promise<CookResult> {
  return fetchJson(`/menu-recipes/${menuRecipeId}/cook`, {
    method: 'POST',
    body: JSON.stringify({ preferLocation }),
  });
}

// ---------- Inventory ----------

export function getInventory(location?: string): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (location) params.set('location', location);
  const qs = params.toString();
  return fetchJson(`/inventory${qs ? `?${qs}` : ''}`);
}

// ---------- Alerts ----------

export function getExpiringAlerts(days = 3): Promise<ExpiringAlert[]> {
  return fetchJson(`/alerts/expiring?days=${days}`);
}

export function getExpiringCount(days = 3): Promise<{ expired: number; soon: number }> {
  return fetchJson(`/alerts/expiring/count?days=${days}`);
}

// ---------- History ----------

export function getCookingHistory(params?: {
  limit?: number;
  offset?: number;
  recipeId?: string;
}): Promise<{ items: HistoryItem[]; total: number }> {
  const sp = new URLSearchParams();
  if (params?.limit) sp.set('limit', String(params.limit));
  if (params?.offset) sp.set('offset', String(params.offset));
  if (params?.recipeId) sp.set('recipeId', params.recipeId);
  const qs = sp.toString();
  return fetchJson(`/cooking/history${qs ? `?${qs}` : ''}`);
}

export function getCookingStats(days = 30): Promise<{
  totalCooks: number;
  distinctRecipes: number;
  topRecipes: Array<{ recipeId: string; recipeTitle: string; count: number }>;
}> {
  return fetchJson(`/cooking/stats?days=${days}`);
}



// ---------- Menus ----------

export interface Menu {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  recipes?: MenuRecipeItem[];
}

export interface MenuRecipeItem {
  id: string;
  menuId: string;
  recipeId: string;
  servings: number;
  scheduledFor: string | null;
  position: number;
  cookedAt: string | null;
  recipe?: { id: string; slug: string; title: string; servings: number; group: string | null };
}

export function getMenus(): Promise<Menu[]> {
  return fetchJson('/menus');
}

export function getMenu(id: string): Promise<Menu & { recipes: MenuRecipeItem[] }> {
  return fetchJson(`/menus/${id}`);
}

export function createMenu(name: string): Promise<Menu> {
  return fetchJson('/menus', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function addRecipeToMenu(menuId: string, recipeId: string, servings = 1): Promise<MenuRecipeItem> {
  return fetchJson(`/menus/${menuId}/recipes`, {
    method: 'POST',
    body: JSON.stringify({ recipeId, servings }),
  });
}

// ---------- Shopping ----------

export interface ShoppingList {
  id: string;
  menuId: string | null;
  status: string;
  createdAt: string;
  items: ShoppingListItem[];
}

export interface ShoppingListItem {
  id: string;
  productId: string;
  product?: { id: string; name: string; slug: string };
  quantity: string;
  unitId: string;
  unit?: { id: string; name: string };
  purchasedQuantity: string;
  purchasedAt: string | null;
  note: string | null;
}

export function generateShoppingList(menuId: string): Promise<ShoppingList> {
  return fetchJson(`/menus/${menuId}/shopping-list`, {
    method: 'POST',
    body: JSON.stringify({ subtractInventory: true }),
  });
}

export function getShoppingList(id: string): Promise<ShoppingList> {
  return fetchJson(`/shopping-lists/${id}`);
}

export function markPurchased(
  listId: string,
  itemId: string,
  opts?: { quantity?: number; location?: string; expiresAt?: string },
): Promise<unknown> {
  return fetchJson(`/shopping-lists/${listId}/items/${itemId}/purchase`, {
    method: 'PATCH',
    body: JSON.stringify(opts ?? {}),
  });
}
