import { cacheLife } from "next/cache";
import type {
  ApiBanner,
  ApiCategory,
  ApiGalleryImage,
  ApiProduct,
  ApiProductList,
  ApiProductStatus,
} from "./api-types";

export * from "./api-types";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000/api";

async function apiFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`);
    if (!res.ok) {
      if (res.status !== 404) {
        console.warn(`[api] GET ${path} -> ${res.status}`);
      }
      return fallback;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[api] failed to reach ${path}:`, err);
    return fallback;
  }
}

export async function getCategories(): Promise<ApiCategory[]> {
  "use cache";
  cacheLife("minutes");
  return apiFetch<ApiCategory[]>("/categories", []);
}

export async function getCategory(id: string): Promise<ApiCategory | null> {
  "use cache";
  cacheLife("minutes");
  return apiFetch<ApiCategory | null>(`/categories/${encodeURIComponent(id)}`, null);
}

export async function getProducts(
  params: {
    categoryId?: string;
    tag?: string;
    search?: string;
    status?: ApiProductStatus;
    featured?: boolean;
    page?: number;
    limit?: number;
  } = {}
): Promise<ApiProductList> {
  "use cache";
  cacheLife("minutes");
  const limit = params.limit ?? 20;
  const page = params.page ?? 1;
  const qs = new URLSearchParams();
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.tag) qs.set("tag", params.tag);
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.featured !== undefined) qs.set("featured", String(params.featured));
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  return apiFetch<ApiProductList>(`/products?${qs.toString()}`, {
    items: [],
    total: 0,
    page,
    limit,
    pageCount: 0,
  });
}

export async function getProductBySlug(slug: string): Promise<ApiProduct | null> {
  "use cache";
  cacheLife("minutes");
  return apiFetch<ApiProduct | null>(`/products/slug/${encodeURIComponent(slug)}`, null);
}

export async function getGalleryImages(): Promise<ApiGalleryImage[]> {
  "use cache";
  cacheLife("minutes");
  return apiFetch<ApiGalleryImage[]>("/gallery", []);
}

/** Homepage banners, newest-first by sort order and filtered to the live ones. */
export async function getBanners(): Promise<ApiBanner[]> {
  "use cache";
  cacheLife("minutes");
  const banners = await apiFetch<ApiBanner[]>("/banners", []);
  return banners
    .filter((banner) => banner.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
