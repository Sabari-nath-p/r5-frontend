import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Categories from "@/components/landing/Categories";
import FeaturedProducts from "@/components/landing/FeaturedProducts";
import GiftBanner from "@/components/landing/GiftBanner";
import Collections from "@/components/landing/Collections";
import TrustBadges from "@/components/landing/TrustBadges";
import GallerySlider from "@/components/landing/GallerySlider";
import Gallery from "@/components/landing/Gallery";
import Footer from "@/components/landing/Footer";
import { getCategories, getGalleryImages, getProducts } from "@/lib/api";

export default async function Home() {
  const [categories, productList, galleryImages] = await Promise.all([
    getCategories(),
    getProducts({ status: "ACTIVE", limit: 10 }),
    getGalleryImages(),
  ]);

  return (
    <>
      <Navbar categories={categories} />
      <main>
        <Hero />
        <GallerySlider images={galleryImages} />
        <Categories categories={categories} />
        <FeaturedProducts products={productList.items} categories={categories} />
        <GiftBanner />
        <Collections />
        <TrustBadges />
        <Gallery images={galleryImages} />
      </main>
      <Footer />
    </>
  );
}
