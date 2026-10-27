import { request } from "@/lib/http-client";
import type {
  ApiAuthUser,
  ApiOrder,
  ApiOrderList,
  ApiPaymentMethod,
} from "@/lib/api-types";

export { ApiError } from "@/lib/http-client";

export type ShopAuthResult = {
  accessToken: string;
  refreshToken: string;
  user: ApiAuthUser;
  profileComplete: boolean;
};

// ---- Auth ----

export function requestOtp(email: string) {
  return request<{ message: string; expiresInMinutes: number }>(
    "/auth/otp/request",
    { method: "POST", body: JSON.stringify({ email }) }
  );
}

export function verifyOtp(input: {
  email: string;
  otp: string;
  name?: string;
  phone?: string;
  countryCode?: string;
}) {
  return request<ShopAuthResult>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function refreshTokens(refreshToken: string) {
  return request<ShopAuthResult>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export function getMe(token: string) {
  return request<ApiAuthUser>("/auth/me", {}, token);
}

export function updateProfile(
  token: string,
  dto: { name?: string; phone?: string; countryCode?: string }
) {
  return request<ApiAuthUser>(
    "/auth/profile",
    { method: "PATCH", body: JSON.stringify(dto) },
    token
  );
}

// ---- Orders ----

export type PlaceOrderInput = {
  items: { productId: string; variationId: string; quantity: number }[];
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipcode: string;
    country?: string;
  };
  phone: string;
  countryCode?: string;
  paymentMethod: ApiPaymentMethod;
  notes?: string;
  /** Guest checkout only; omitted entirely when a token is supplied. */
  name?: string;
  email?: string;
  otp?: string;
};

/** The first guest call returns this instead of an order. */
export type OtpRequiredResult = {
  otpRequired: true;
  email: string;
  expiresInMinutes: number;
  message: string;
};

export type PlacedOrderResult = {
  otpRequired: false;
  order: ApiOrder;
  payment: { paymentSessionId: string; cashfreeOrderId: string } | null;
};

export type PlaceOrderResult = OtpRequiredResult | PlacedOrderResult;

export function placeOrder(input: PlaceOrderInput, token?: string | null) {
  return request<PlaceOrderResult>(
    "/orders",
    { method: "POST", body: JSON.stringify(input) },
    token
  );
}

export function getMyOrders(token: string, params: { page?: number; limit?: number } = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 20));
  return request<ApiOrderList>(`/orders/mine?${qs.toString()}`, {}, token);
}

export function getOrder(token: string, id: string) {
  return request<ApiOrder>(`/orders/${id}`, {}, token);
}

/** Lets a guest reopen an order with the number and the email they used. */
export function lookupOrder(email: string, orderNumber: string) {
  return request<ApiOrder>("/orders/lookup", {
    method: "POST",
    body: JSON.stringify({ email, orderNumber }),
  });
}

export function verifyPayment(orderNumber: string) {
  return request<ApiOrder>(
    `/payments/cashfree/verify/${encodeURIComponent(orderNumber)}`,
    { method: "POST" }
  );
}
