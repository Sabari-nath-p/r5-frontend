"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { useAdminUpload } from "@/lib/admin/use-upload";
import {
  ApiError,
  categoriesApi,
  productsApi,
  tagsApi,
  type ProductImageInput,
  type ProductInput,
  type ProductVariationInput,
} from "@/lib/admin/client";
import type { ApiCategory, ApiProduct, ApiProductStatus, ApiTag } from "@/lib/api-types";
import { plainTextToTiptap, tiptapToPlainText } from "@/lib/tiptap-text";
import ImageUploadField from "./ImageUploadField";
import styles from "./admin.module.css";

function emptyImage(): ProductImageInput {
  return { url: "", sortOrder: 0 };
}

function emptyVariation(): ProductVariationInput {
  return { name: "", price: 0, strikeThroughPrice: undefined, stock: 0, sku: "" };
}

export default function ProductForm({ initialProduct }: { initialProduct?: ApiProduct }) {
  const { getToken } = useAdminAuth();
  const onUpload = useAdminUpload("products");
  const router = useRouter();

  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [allTags, setAllTags] = useState<ApiTag[]>([]);
  const [newTagName, setNewTagName] = useState("");

  const [name, setName] = useState(initialProduct?.name ?? "");
  const [categoryId, setCategoryId] = useState(initialProduct?.categoryId ?? "");
  const [status, setStatus] = useState<ApiProductStatus>(initialProduct?.status ?? "DRAFT");
  const [metaTitle, setMetaTitle] = useState(initialProduct?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initialProduct?.metaDescription ?? "");
  const [metaImage, setMetaImage] = useState(initialProduct?.metaImage ?? "");
  const [descriptionText, setDescriptionText] = useState(
    initialProduct ? tiptapToPlainText(initialProduct.description) : ""
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialProduct?.tags.map((t) => t.name) ?? []
  );
  const [images, setImages] = useState<ProductImageInput[]>(
    initialProduct && initialProduct.images.length > 0
      ? initialProduct.images.map((img) => ({ url: img.url, sortOrder: img.sortOrder }))
      : [emptyImage()]
  );
  const [variations, setVariations] = useState<ProductVariationInput[]>(
    initialProduct && initialProduct.variations.length > 0
      ? initialProduct.variations.map((v) => ({
          name: v.name,
          price: Number(v.price),
          strikeThroughPrice: v.strikeThroughPrice ? Number(v.strikeThroughPrice) : undefined,
          stock: v.stock,
          sku: v.sku ?? "",
        }))
      : [emptyVariation()]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    categoriesApi.list().then(setCategories);
    tagsApi.list().then(setAllTags);
  }, []);

  function toggleTag(name: string) {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  }

  function addNewTag() {
    const value = newTagName.trim();
    if (!value) return;
    if (!selectedTags.includes(value)) setSelectedTags((prev) => [...prev, value]);
    setNewTagName("");
  }

  function updateImage(index: number, patch: Partial<ProductImageInput>) {
    setImages((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function updateVariation(index: number, patch: Partial<ProductVariationInput>) {
    setVariations((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validImages = images.filter((img) => img.url.trim().length > 0);
    if (validImages.length === 0) {
      setError("Add at least one product image.");
      return;
    }
    const validVariations = variations.filter((v) => v.name.trim().length > 0);
    if (validVariations.length === 0) {
      setError("Add at least one variation (e.g. a size or price option).");
      return;
    }
    if (!categoryId) {
      setError("Select a category.");
      return;
    }

    const dto: ProductInput = {
      name,
      categoryId,
      status,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      metaImage: metaImage || undefined,
      description: plainTextToTiptap(descriptionText),
      tags: selectedTags,
      images: validImages.map((img, i) => ({ url: img.url, sortOrder: img.sortOrder ?? i })),
      variations: validVariations.map((v) => ({
        name: v.name,
        price: Number(v.price),
        strikeThroughPrice:
          v.strikeThroughPrice !== undefined && v.strikeThroughPrice !== null && `${v.strikeThroughPrice}` !== ""
            ? Number(v.strikeThroughPrice)
            : undefined,
        stock: Number(v.stock),
        sku: v.sku || undefined,
      })),
    };

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      if (initialProduct) {
        await productsApi.update(token, initialProduct.id, dto);
      } else {
        await productsApi.create(token, dto);
      }
      router.push("/myportal/products");
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <input
              className={styles.input}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select
              className={styles.select}
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Status</label>
          <select
            className={styles.select}
            style={{ maxWidth: 200 }}
            value={status}
            onChange={(e) => setStatus(e.target.value as ApiProductStatus)}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={descriptionText}
            onChange={(e) => setDescriptionText(e.target.value)}
            placeholder="Separate paragraphs with a blank line."
          />
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.label} style={{ marginBottom: 12 }}>
          SEO (optional)
        </p>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Meta title</label>
            <input
              className={styles.input}
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Meta description</label>
            <input
              className={styles.input}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
            />
          </div>
        </div>
        <ImageUploadField
          label="Meta image"
          value={metaImage}
          onChange={setMetaImage}
          onUpload={onUpload}
        />
      </div>

      <div className={styles.card}>
        <p className={styles.label} style={{ marginBottom: 12 }}>
          Tags
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={selectedTags.includes(tag.name) ? styles.badgePill : styles.badgePillMuted}
              onClick={() => toggleTag(tag.name)}
              style={{ border: "none", cursor: "pointer" }}
            >
              {tag.name}
            </button>
          ))}
          {selectedTags
            .filter((name) => !allTags.some((t) => t.name === name))
            .map((name) => (
              <button
                key={name}
                type="button"
                className={styles.badgePill}
                onClick={() => toggleTag(name)}
                style={{ border: "none", cursor: "pointer" }}
              >
                {name} ✕
              </button>
            ))}
        </div>
        <div className={styles.grid2}>
          <input
            type="text"
            className={styles.input}
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNewTag();
              }
            }}
          />
          <button type="button" className={styles.buttonSecondary} onClick={addNewTag}>
            Add tag
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <p className={styles.label} style={{ marginBottom: 12 }}>
          Images
        </p>
        <div className={styles.repeatList}>
          {images.map((img, i) => (
            <div className={styles.repeatRow} key={i}>
              <div className={styles.repeatFields} style={{ gridTemplateColumns: "1fr" }}>
                <ImageUploadField
                  value={img.url}
                  onChange={(url) => updateImage(i, { url })}
                  onUpload={onUpload}
                />
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Sort order"
                  value={img.sortOrder ?? 0}
                  onChange={(e) => updateImage(i, { sortOrder: Number(e.target.value) })}
                  style={{ maxWidth: 160 }}
                />
              </div>
              {images.length > 1 && (
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => setImages((prev) => [...prev, emptyImage()])}
        >
          <Plus size={14} /> Add image
        </button>
      </div>

      <div className={styles.card}>
        <p className={styles.label} style={{ marginBottom: 12 }}>
          Variations (size, color, pricing options)
        </p>
        <div className={styles.repeatList}>
          {variations.map((v, i) => (
            <div className={styles.repeatRow} key={i}>
              <div className={styles.repeatFields}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Name (e.g. Size 7 / Gold)"
                  required
                  value={v.name}
                  onChange={(e) => updateVariation(i, { name: e.target.value })}
                />
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Price"
                  min={0}
                  step="0.01"
                  required
                  value={v.price}
                  onChange={(e) => updateVariation(i, { price: Number(e.target.value) })}
                />
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Strike-through price"
                  min={0}
                  step="0.01"
                  value={v.strikeThroughPrice ?? ""}
                  onChange={(e) =>
                    updateVariation(i, {
                      strikeThroughPrice: e.target.value === "" ? undefined : Number(e.target.value),
                    })
                  }
                />
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Stock"
                  min={0}
                  required
                  value={v.stock}
                  onChange={(e) => updateVariation(i, { stock: Number(e.target.value) })}
                />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="SKU (optional)"
                  value={v.sku ?? ""}
                  onChange={(e) => updateVariation(i, { sku: e.target.value })}
                />
              </div>
              {variations.length > 1 && (
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => setVariations((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove variation"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => setVariations((prev) => [...prev, emptyVariation()])}
        >
          <Plus size={14} /> Add variation
        </button>
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={saving}>
          {saving ? "Saving…" : initialProduct ? "Update product" : "Create product"}
        </button>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => router.push("/myportal/products")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
