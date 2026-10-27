import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import BannerSlider from "@/components/landing/BannerSlider";
import Categories from "@/components/landing/Categories";
import FeaturedProducts from "@/components/landing/FeaturedProducts";
import GiftBanner from "@/components/landing/GiftBanner";
import Collections from "@/components/landing/Collections";
import TrustBadges from "@/components/landing/TrustBadges";
import Gallery from "@/components/landing/Gallery";
import Footer from "@/components/landing/Footer";
import { getBanners, getCategories, getGalleryImages, getProducts } from "@/lib/api";

export default async function Home() {
  const [categories, featuredList, latestList, galleryImages, banners] = await Promise.all([
    getCategories(),
    getProducts({ status: "ACTIVE", featured: true, limit: 12 }),
    getProducts({ status: "ACTIVE", limit: 12 }),
    getGalleryImages(),
    getBanners(),
  ]);

  // Admins pick the featured row in /myportal/products; until anything is
  // flagged, the newest active products stand in so the section is never empty.
  const featured = featuredList.items.length > 0 ? featuredList.items : latestList.items;

  return (
    <>
      <Navbar categories={categories} />
      <main>
        <Hero />
        {/* Banner images come from the admin portal (/myportal/banners). */}
        <BannerSlider banners={banners} />
        <Categories categories={categories} />
        <FeaturedProducts products={featured} categories={categories} />
        <GiftBanner />
        <Collections />
        <TrustBadges />
        <Gallery images={galleryImages} />
      </main>
      <Footer />
    </>
  );
}
