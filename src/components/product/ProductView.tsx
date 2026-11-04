"use client";

import { useState } from "react";
import { cheapestVariation, type ApiProduct } from "@/lib/api-types";
import Gallery from "./Gallery";
import ProductInfo from "./ProductInfo";

// Variant selection lives here, above both children, so picking a variant in
// ProductInfo can swap the images Gallery shows.
export default function ProductView({ product }: { product: ApiProduct }) {
  const defaultVariation = cheapestVariation(product.variations) ?? product.variations[0];
  const [variationId, setVariationId] = useState(defaultVariation?.id);

  const variation = product.variations.find((v) => v.id === variationId) ?? defaultVariation;
  const galleryImages =
    variation && variation.images.length > 0 ? variation.images : product.images;

  return (
    <>
      <Gallery images={galleryImages} name={product.name} />
      <ProductInfo product={product} variationId={variationId} onVariationChange={setVariationId} />
    </>
  );
}
