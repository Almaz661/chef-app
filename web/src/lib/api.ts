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
