import { request } from "@/lib/http-client";
import type {
  ApiAuthUser,
  ApiBanner,
  ApiCategory,
  ApiGalleryImage,
  ApiOrder,
  ApiOrderList,
  ApiOrderStatus,
  ApiPaymentStatus,
  ApiProduct,
  ApiProductList,
  ApiProductStatus,
  ApiRole,
  ApiStatus,
  ApiTag,
} from "@/lib/api-types";

export { ApiError } from "@/lib/http-client";

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
  isFeatured?: boolean;
  tags?: string[];
  images: ProductImageInput[];
  variations: ProductVariationInput[];
};

export const productsApi = {
  list: (params: { page?: number; limit?: number; featured?: boolean } = {}) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("limit", String(params.limit ?? 100));
    if (params.featured !== undefined) qs.set("featured", String(params.featured));
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

// ---- Orders ----

export type OrderUpdateInput = {
  status?: ApiOrderStatus;
  paymentStatus?: ApiPaymentStatus;
  deliveryPartner?: string;
  trackingUrl?: string;
  notes?: string;
};

export const ordersApi = {
  list: (
    token: string,
    params: { page?: number; limit?: number; status?: ApiOrderStatus; search?: string } = {}
  ) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("limit", String(params.limit ?? 50));
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("search", params.search);
    return request<ApiOrderList>(`/orders?${qs.toString()}`, {}, token);
  },
  update: (token: string, id: string, dto: OrderUpdateInput) =>
    request<ApiOrder>(`/orders/${id}`, { method: "PATCH", body: JSON.stringify(dto) }, token),
};

// ---- Users ----

export type ApiAdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: ApiRole;
  isVerified: boolean;
  createdAt: string;
};

export const usersApi = {
  list: (token: string) => request<ApiAdminUser[]>("/users", {}, token),
};
