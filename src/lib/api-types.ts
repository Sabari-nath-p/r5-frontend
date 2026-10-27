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
  /** Hand-picked for the homepage "Featured Products" row. */
  isFeatured: boolean;
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
  name?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  /** False while the account still needs a name and phone number. */
  profileComplete?: boolean;
};

// ---- Orders ----

export type ApiOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PACKING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type ApiPaymentMethod = "COD" | "CASHFREE";
export type ApiPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type ApiOrderItem = {
  id: string;
  productId: string;
  variationId: string;
  productName: string;
  productSlug: string;
  variationName: string;
  image: string | null;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
};

export type ApiOrder = {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  countryCode: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  zipcode: string;
  country: string;
  subtotal: string;
  shipping: string;
  total: string;
  status: ApiOrderStatus;
  paymentMethod: ApiPaymentMethod;
  paymentStatus: ApiPaymentStatus;
  deliveryPartner: string | null;
  trackingUrl: string | null;
  notes: string | null;
  items: ApiOrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type ApiOrderList = {
  items: ApiOrder[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

/** The steps a parcel moves through, in the order they are shown to customers. */
export const ORDER_STAGES: ApiOrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
];

export const ORDER_STATUS_LABELS: Record<ApiOrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PACKING: "Packing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
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
