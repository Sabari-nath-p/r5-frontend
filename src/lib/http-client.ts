export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Single fetch wrapper for every browser-side call to the API: JSON in, JSON
 * out, with Nest's validation errors flattened into one readable message.
 */
export async function request<T>(
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

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const rawMessage = data?.message ?? data?.error ?? `Request failed (${res.status})`;
    const message = Array.isArray(rawMessage) ? rawMessage.join(", ") : String(rawMessage);
    throw new ApiError(res.status, message);
  }

  return data as T;
}
