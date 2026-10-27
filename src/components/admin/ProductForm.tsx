"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, GripVertical, Plus, X } from "lucide-react";
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
import { useToast } from "./Toast";
import styles from "./admin.module.css";
import local from "./ProductForm.module.css";

function emptyImage(): ProductImageInput {
  return { url: "", sortOrder: 0 };
}

function emptyVariation(): ProductVariationInput {
  return { name: "", price: 0, strikeThroughPrice: undefined, stock: 0, sku: "" };
}

/**
 * The product editor stays a full page rather than a dialog: it carries four
 * sections, repeatable images and variations, and is the one form in the portal
 * that doesn't fit a modal comfortably.
 */
export default function ProductForm({ initialProduct }: { initialProduct?: ApiProduct }) {
  const { getToken } = useAdminAuth();
  const onUpload = useAdminUpload("products");
  const toast = useToast();
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

  function toggleTag(tagName: string) {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
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
          v.strikeThroughPrice !== undefined &&
          v.strikeThroughPrice !== null &&
          `${v.strikeThroughPrice}` !== ""
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
        toast.success("Product updated.");
      } else {
        await productsApi.create(token, dto);
        toast.success("Product created.");
      }
      router.push("/myportal/products");
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={local.layout} onSubmit={handleSubmit}>
      {error && (
        <p className={`${styles.error} ${local.fullWidth}`}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </p>
      )}

      <div className={local.main}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Basics</span>
          </div>
          <div className={`${styles.cardPad} ${styles.form}`}>
            <div className={styles.field}>
              <label className={styles.label}>Product name</label>
              <input
                className={styles.input}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tulip bouquet"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="Separate paragraphs with a blank line."
                rows={6}
              />
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardTitle}>Images</span>
              <p className={styles.cardMeta}>The lowest sort order becomes the cover image.</p>
            </div>
            <button
              type="button"
              className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
              onClick={() => setImages((prev) => [...prev, emptyImage()])}
            >
              <Plus size={14} /> Add image
            </button>
          </div>
          <div className={styles.cardPad}>
            <div className={styles.repeatList}>
              {images.map((img, i) => (
                <div className={styles.repeatRow} key={i}>
                  <span className={styles.repeatIndex}>{i + 1}</span>
                  <div className={styles.repeatFields} style={{ gridTemplateColumns: "1fr" }}>
                    <ImageUploadField
                      value={img.url}
                      onChange={(url) => updateImage(i, { url })}
                      onUpload={onUpload}
                    />
                    <div className={styles.field} style={{ maxWidth: 170 }}>
                      <label className={styles.label}>Sort order</label>
                      <input
                        type="number"
                        className={styles.input}
                        value={img.sortOrder ?? 0}
                        onChange={(e) => updateImage(i, { sortOrder: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  {images.length > 1 && (
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remove image ${i + 1}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardTitle}>Variations</span>
              <p className={styles.cardMeta}>Size, colour or pricing options — at least one.</p>
            </div>
            <button
              type="button"
              className={`${styles.buttonSecondary} ${styles.buttonSmall}`}
              onClick={() => setVariations((prev) => [...prev, emptyVariation()])}
            >
              <Plus size={14} /> Add variation
            </button>
          </div>
          <div className={styles.cardPad}>
            <div className={styles.repeatList}>
              {variations.map((v, i) => (
                <div className={styles.repeatRow} key={i}>
                  <span className={styles.repeatIndex}>
                    <GripVertical size={13} />
                  </span>
                  <div className={local.variationGrid}>
                    <div className={styles.field}>
                      <label className={styles.label}>Name</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Size 7 / Gold"
                        required
                        value={v.name}
                        onChange={(e) => updateVariation(i, { name: e.target.value })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Price (₹)</label>
                      <input
                        type="number"
                        className={styles.input}
                        min={0}
                        step="0.01"
                        required
                        value={v.price}
                        onChange={(e) => updateVariation(i, { price: Number(e.target.value) })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Was (₹)</label>
                      <input
                        type="number"
                        className={styles.input}
                        min={0}
                        step="0.01"
                        placeholder="Optional"
                        value={v.strikeThroughPrice ?? ""}
                        onChange={(e) =>
                          updateVariation(i, {
                            strikeThroughPrice:
                              e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Stock</label>
                      <input
                        type="number"
                        className={styles.input}
                        min={0}
                        required
                        value={v.stock}
                        onChange={(e) => updateVariation(i, { stock: Number(e.target.value) })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>SKU</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Optional"
                        value={v.sku ?? ""}
                        onChange={(e) => updateVariation(i, { sku: e.target.value })}
                      />
                    </div>
                  </div>
                  {variations.length > 1 && (
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.iconButtonDanger}`}
                      onClick={() => setVariations((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remove variation ${i + 1}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <span className={styles.cardTitle}>SEO</span>
              <p className={styles.cardMeta}>Optional — falls back to the product name.</p>
            </div>
          </div>
          <div className={`${styles.cardPad} ${styles.form}`}>
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
        </section>
      </div>

      <aside className={local.side}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Organisation</span>
          </div>
          <div className={`${styles.cardPad} ${styles.form}`}>
            <div className={styles.field}>
              <label className={styles.label}>Status</label>
              <select
                className={styles.select}
                value={status}
                onChange={(e) => setStatus(e.target.value as ApiProductStatus)}
              >
                <option value="DRAFT">Draft — hidden from the shop</option>
                <option value="ACTIVE">Active — live on the shop</option>
                <option value="INACTIVE">Inactive — archived</option>
              </select>
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
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Tags</span>
          </div>
          <div className={`${styles.cardPad} ${styles.form}`}>
            <div className={styles.chipRow}>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={selectedTags.includes(tag.name) ? styles.chipActive : styles.chip}
                  onClick={() => toggleTag(tag.name)}
                >
                  {tag.name}
                </button>
              ))}
              {selectedTags
                .filter((tagName) => !allTags.some((t) => t.name === tagName))
                .map((tagName) => (
                  <button
                    key={tagName}
                    type="button"
                    className={styles.chipActive}
                    onClick={() => toggleTag(tagName)}
                  >
                    {tagName} <X size={12} />
                  </button>
                ))}
              {allTags.length === 0 && selectedTags.length === 0 && (
                <span className={styles.hint}>No tags yet — add one below.</span>
              )}
            </div>

            <div className={local.tagAdd}>
              <input
                type="text"
                className={styles.input}
                placeholder="New tag"
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
                Add
              </button>
            </div>
          </div>
        </section>
      </aside>

      <div className={local.actionBar}>
        <span className={styles.hint}>
          {initialProduct ? "Editing an existing product." : "This product isn't saved yet."}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.buttonSecondary}
            onClick={() => router.push("/myportal/products")}
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className={styles.button} disabled={saving}>
            {saving ? "Saving…" : initialProduct ? "Save changes" : "Create product"}
          </button>
        </div>
      </div>
    </form>
  );
}
