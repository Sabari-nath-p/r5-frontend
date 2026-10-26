import type {
  ApiAuthUser,
  ApiBanner,
  ApiCategory,
  ApiGalleryImage,
  ApiProduct,
  ApiProductList,
  ApiProductStatus,
  ApiStatus,
  ApiTag,
} from "@/lib/api-types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const rawMessage = data?.message ?? data?.error ?? `Request failed (${res.status})`;
    const message = Array.isArray(rawMessage) ? rawMessage.join(", ") : String(rawMessage);
    throw new ApiError(res.status, message);
  }

  return data as T;
}

// ---- Auth ----

export type AuthResult = { accessToken: string; refreshToken: string; user: ApiAuthUser };

export function requestOtp(email: string) {
  return request<{ message: string; expiresInMinutes: number }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function verifyOtp(email: string, otp: string, name?: string) {
  return request<AuthResult>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp, name }),
  });
}

export function refreshTokens(refreshToken: string) {
  return request<AuthResult>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function uploadImage(token: string, file: File, folder: string): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file);
  return request<{ url: string }>(`/uploads/image?folder=${encodeURIComponent(folder)}`, {
    method: "POST",
    body: form,
  }, token);
}

// ---- Categories ----

export type CategoryInput = {
  name: string;
  description?: string;
  image?: string;
  sortOrder?: number;
  status?: ApiStatus;
};

export const categoriesApi = {
  list: () => request<ApiCategory[]>("/categories"),
  create: (token: string, dto: CategoryInput) =>
    request<ApiCategory>("/categories", { method: "POST", body: JSON.stringify(dto) }, token),
  update: (token: string, id: string, dto: Partial<CategoryInput>) =>
    request<ApiCategory>(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(dto) }, token),
  remove: (token: string, id: string) =>
    request<{ success: boolean }>(`/categories/${id}`, { method: "DELETE" }, token),
};

// ---- Tags ----

export const tagsApi = {
  list: () => request<ApiTag[]>("/tags"),
  create: (token: string, name: string) =>
    request<ApiTag>("/tags", { method: "POST", body: JSON.stringify({ name }) }, token),
  remove: (token: string, id: string) =>
    request<{ success: boolean }>(`/tags/${id}`, { method: "DELETE" }, token),
};

// ---- Gallery ----

export type GalleryImageInput = { url: string; sortOrder?: number; redirectUrl?: string };

export const galleryApi = {
  list: () => request<ApiGalleryImage[]>("/gallery"),
  createMany: (token: string, images: GalleryImageInput[]) =>
    request<ApiGalleryImage[]>("/gallery", { method: "POST", body: JSON.stringify({ images }) }, token),
  update: (token: string, id: string, dto: Partial<GalleryImageInput>) =>
    request<ApiGalleryImage>(`/gallery/${id}`, { method: "PATCH", body: JSON.stringify(dto) }, token),
  remove: (token: string, id: string) =>
    request<{ success: boolean }>(`/gallery/${id}`, { method: "DELETE" }, token),
};

// ---- Banners ----

export type BannerInput = {
  title: string;
  subtitle?: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export const bannersApi = {
  list: () => request<ApiBanner[]>("/banners"),
  create: (token: string, dto: BannerInput) =>
    request<ApiBanner>("/banners", { method: "POST", body: JSON.stringify(dto) }, token),
  update: (token: string, id: string, dto: Partial<BannerInput>) =>
    request<ApiBanner>(`/banners/${id}`, { method: "PATCH", body: JSON.stringify(dto) }, token),
  remove: (token: string, id: string) =>
    request<{ success: boolean }>(`/banners/${id}`, { method: "DELETE" }, token),
};

// ---- Products ----

export type ProductImageInput = { url: string; sortOrder?: number };
export type ProductVariationInput = {
  name: string;
  price: number;
  strikeThroughPrice?: number;
  stock: number;
  sku?: string;
};

export type ProductInput = {
  name: string;
  categoryId: string;
  description?: Record<string, unknown>;
  metaTitle?: string;
  metaDescription?: string;
  metaImage?: string;
  status?: ApiProductStatus;
  tags?: string[];
  images: ProductImageInput[];
  variations: ProductVariationInput[];
};

export const productsApi = {
  list: (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("limit", String(params.limit ?? 100));
    return request<ApiProductList>(`/products?${qs.toString()}`);
  },
  get: (id: string) => request<ApiProduct>(`/products/${id}`),
  create: (token: string, dto: ProductInput) =>
    request<ApiProduct>("/products", { method: "POST", body: JSON.stringify(dto) }, token),
  update: (token: string, id: string, dto: Partial<ProductInput>) =>
    request<ApiProduct>(`/products/${id}`, { method: "PATCH", body: JSON.stringify(dto) }, token),
  remove: (token: string, id: string) =>
    request<{ success: boolean }>(`/products/${id}`, { method: "DELETE" }, token),
};
