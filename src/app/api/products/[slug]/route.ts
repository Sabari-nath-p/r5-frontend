import { productCatalog } from "@/lib/product-catalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = productCatalog.find((p) => p.slug === slug);

  if (!product) {
    return Response.json({ success: false, error: "Product not found." }, { status: 404 });
  }

  return Response.json({ success: true, data: product });
}
