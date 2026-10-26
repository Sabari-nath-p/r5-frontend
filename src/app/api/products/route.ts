import { NextRequest } from "next/server";
import { categories, productCatalog, type CatalogProduct } from "@/lib/product-catalog";
import { parseBoolean, parseNumber } from "@/lib/query-utils";

const SORT_OPTIONS = ["newest", "price_asc", "price_desc", "rating_desc"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const category = searchParams.get("category")?.trim().toLowerCase();
  const tagsParam = searchParams.get("tags") ?? searchParams.get("tag");
  const tags = tagsParam
    ? tagsParam
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : undefined;
  const search = searchParams.get("search")?.trim().toLowerCase();

  const isActiveParam = searchParams.get("active") ?? searchParams.get("isActive");
  const isFeaturedParam = searchParams.get("featured") ?? searchParams.get("isFeatured");
  const inStockParam = searchParams.get("inStock");

  const isActive = parseBoolean(isActiveParam);
  const isFeatured = parseBoolean(isFeaturedParam);
  const inStock = parseBoolean(inStockParam);

  if (isActiveParam !== null && isActive === undefined) {
    return Response.json(
      { success: false, error: "`active` must be 'true' or 'false'." },
      { status: 400 }
    );
  }
  if (isFeaturedParam !== null && isFeatured === undefined) {
    return Response.json(
      { success: false, error: "`featured` must be 'true' or 'false'." },
      { status: 400 }
    );
  }
  if (inStockParam !== null && inStock === undefined) {
    return Response.json(
      { success: false, error: "`inStock` must be 'true' or 'false'." },
      { status: 400 }
    );
  }

  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const minPrice = parseNumber(minPriceParam);
  const maxPrice = parseNumber(maxPriceParam);

  if (minPriceParam !== null && minPrice === undefined) {
    return Response.json({ success: false, error: "`minPrice` must be a number." }, { status: 400 });
  }
  if (maxPriceParam !== null && maxPrice === undefined) {
    return Response.json({ success: false, error: "`maxPrice` must be a number." }, { status: 400 });
  }

  const sortParam = (searchParams.get("sort") ?? "newest") as SortOption;
  if (!SORT_OPTIONS.includes(sortParam)) {
    return Response.json(
      { success: false, error: `\`sort\` must be one of: ${SORT_OPTIONS.join(", ")}.` },
      { status: 400 }
    );
  }

  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const page = pageParam === null ? 1 : parseNumber(pageParam);
  const limit = limitParam === null ? 12 : parseNumber(limitParam);

  if (page === undefined || page < 1 || !Number.isInteger(page)) {
    return Response.json(
      { success: false, error: "`page` must be a positive integer." },
      { status: 400 }
    );
  }
  if (limit === undefined || limit < 1 || !Number.isInteger(limit) || limit > 60) {
    return Response.json(
      { success: false, error: "`limit` must be a positive integer, max 60." },
      { status: 400 }
    );
  }

  let results: CatalogProduct[] = productCatalog;

  if (category) {
    results = results.filter((p) => p.category === category);
  }
  if (tags && tags.length > 0) {
    results = results.filter((p) => p.tags.some((t) => tags.includes(t.toLowerCase())));
  }
  if (search) {
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search)
    );
  }
  if (isActive !== undefined) {
    results = results.filter((p) => p.isActive === isActive);
  }
  if (isFeatured !== undefined) {
    results = results.filter((p) => p.isFeatured === isFeatured);
  }
  if (inStock !== undefined) {
    results = results.filter((p) => (inStock ? p.stock > 0 : p.stock === 0));
  }
  if (minPrice !== undefined) {
    results = results.filter((p) => p.price >= minPrice);
  }
  if (maxPrice !== undefined) {
    results = results.filter((p) => p.price <= maxPrice);
  }

  results = [...results].sort((a, b) => {
    switch (sortParam) {
      case "price_asc":
        return a.price - b.price;
      case "price_desc":
        return b.price - a.price;
      case "rating_desc":
        return b.rating - a.rating;
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  return Response.json({
    success: true,
    data: paged,
    meta: {
      total,
      page,
      limit,
      totalPages,
      categories,
      tags: Array.from(new Set(productCatalog.flatMap((p) => p.tags))).sort(),
    },
  });
}
