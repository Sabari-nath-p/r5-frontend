import { NextRequest } from "next/server";
import { bannerCatalog, type Banner, type BannerType } from "@/lib/banner-catalog";
import { parseBoolean } from "@/lib/query-utils";

const BANNER_TYPES: BannerType[] = ["hero", "gift", "promo", "category"];

function isLive(banner: Banner, now: Date): boolean {
  if (banner.startDate && now < new Date(banner.startDate)) return false;
  if (banner.endDate && now > new Date(banner.endDate)) return false;
  return true;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const typeParam = searchParams.get("type")?.trim().toLowerCase();
  if (typeParam && !BANNER_TYPES.includes(typeParam as BannerType)) {
    return Response.json(
      { success: false, error: `\`type\` must be one of: ${BANNER_TYPES.join(", ")}.` },
      { status: 400 }
    );
  }

  const activeParam = searchParams.get("active") ?? searchParams.get("isActive");
  const isActive = parseBoolean(activeParam);
  if (activeParam !== null && isActive === undefined) {
    return Response.json(
      { success: false, error: "`active` must be 'true' or 'false'." },
      { status: 400 }
    );
  }

  const liveParam = searchParams.get("live");
  const live = parseBoolean(liveParam);
  if (liveParam !== null && live === undefined) {
    return Response.json(
      { success: false, error: "`live` must be 'true' or 'false'." },
      { status: 400 }
    );
  }

  let results: Banner[] = bannerCatalog;

  if (typeParam) {
    results = results.filter((b) => b.type === typeParam);
  }
  if (isActive !== undefined) {
    results = results.filter((b) => b.isActive === isActive);
  }
  if (live !== undefined) {
    const now = new Date();
    results = results.filter((b) => isLive(b, now) === live);
  }

  results = [...results].sort((a, b) => a.order - b.order);

  return Response.json({
    success: true,
    data: results,
    meta: {
      total: results.length,
      types: BANNER_TYPES,
    },
  });
}
