export type ApiStatus = "ACTIVE" | "INACTIVE";
export type ApiProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export type ApiCategory = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  status: ApiStatus;
  createdAt: string;
  updatedAt: string;
};

export type ApiTag = {
  id: string;
  name: string;
};

export type ApiProductImage = {
  id: string;
  url: string;
  sortOrder: number;
};

export type ApiProductVariation = {
  id: string;
  name: string;
  price: string;
  strikeThroughPrice: string | null;
  stock: number;
  sku: string | null;
};

export type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  description: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
  metaImage: string | null;
  status: ApiProductStatus;
  categoryId: string;
  category: ApiCategory;
  images: ApiProductImage[];
  variations: ApiProductVariation[];
  tags: ApiTag[];
  createdAt: string;
  updatedAt: string;
};

export type ApiProductList = {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export type ApiGalleryImage = {
  id: string;
  url: string;
  redirectUrl: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  ctaText: string | null;
  ctaLink: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiRole = "ADMIN" | "USER";

export type ApiAuthUser = {
  id: string;
  email: string;
  role: ApiRole;
};

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value);
}

export function sortedImages(images: ApiProductImage[]): ApiProductImage[] {
  return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function cheapestVariation(
  variations: ApiProductVariation[]
): ApiProductVariation | undefined {
  return [...variations].sort((a, b) => toNumber(a.price) - toNumber(b.price))[0];
}
