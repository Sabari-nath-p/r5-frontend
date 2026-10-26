"use client";

import { useAdminAuth } from "./auth-context";
import { uploadImage } from "./client";

export function useAdminUpload(folder: string) {
  const { getToken } = useAdminAuth();

  return async function onUpload(file: File): Promise<string> {
    const token = await getToken();
    if (!token) throw new Error("Session expired. Please sign in again.");
    const { url } = await uploadImage(token, file, folder);
    return url;
  };
}
