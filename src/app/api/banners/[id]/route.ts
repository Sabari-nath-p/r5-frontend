import { bannerCatalog } from "@/lib/banner-catalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const banner = bannerCatalog.find((b) => b.id === id);

  if (!banner) {
    return Response.json({ success: false, error: "Banner not found." }, { status: 404 });
  }

  return Response.json({ success: true, data: banner });
}
