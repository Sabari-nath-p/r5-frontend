export type BannerTone = "lavender" | "gold" | "blush" | "cream";
export type BannerType = "hero" | "gift" | "promo" | "category";

export type Banner = {
  id: string;
  type: BannerType;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  tone: BannerTone;
  order: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
};

export const bannerCatalog: Banner[] = [
  {
    id: "1",
    type: "hero",
    title: "Crafted with Love",
    subtitle:
      "Unique crochet creations, thoughtful gifts and creative paper products — made to add warmth, joy and personality to your everyday moments.",
    image: "/images/banners/hero-crafted-with-love.jpg",
    ctaText: "Shop Now",
    ctaLink: "/#shop",
    tone: "lavender",
    order: 1,
    isActive: true,
    startDate: null,
    endDate: null,
  },
  {
    id: "2",
    type: "hero",
    title: "Small Things, Big Happiness",
    subtitle: "Handmade pieces that bring a little extra joy to your day.",
    image: "/images/banners/hero-small-things-big-happiness.jpg",
    ctaText: "Explore Collections",
    ctaLink: "/#collections",
    tone: "gold",
    order: 2,
    isActive: true,
    startDate: null,
    endDate: null,
  },
  {
    id: "3",
    type: "hero",
    title: "New Festive Arrivals",
    subtitle: "Fresh handmade designs just in time for the festive season.",
    image: "/images/banners/hero-festive-arrivals.jpg",
    ctaText: "See What's New",
    ctaLink: "/#shop",
    tone: "blush",
    order: 3,
    isActive: true,
    startDate: "2026-10-01",
    endDate: "2026-11-15",
  },
  {
    id: "4",
    type: "gift",
    title: "Thoughtful Gifts for Every Occasion",
    subtitle:
      "Birthdays, Anniversaries, Festive Hampers and more — because every moment deserves something special.",
    image: "/images/banners/gift-sets.jpg",
    ctaText: "Explore Gift Sets",
    ctaLink: "/#gift-sets",
    tone: "gold",
    order: 1,
    isActive: true,
    startDate: null,
    endDate: null,
  },
  {
    id: "5",
    type: "promo",
    title: "A Little Handmade Happiness",
    subtitle: "Discover small-batch handmade pieces made just for you.",
    image: "/images/banners/promo-handmade-happiness.jpg",
    ctaText: "Shop the Edit",
    ctaLink: "/#shop",
    tone: "blush",
    order: 1,
    isActive: true,
    startDate: null,
    endDate: null,
  },
  {
    id: "6",
    type: "category",
    title: "Shop by Category",
    subtitle: "Find the perfect handmade piece across all our collections.",
    image: "/images/banners/category-shop-by-category.jpg",
    ctaText: "View All Categories",
    ctaLink: "/#categories",
    tone: "cream",
    order: 1,
    isActive: false,
    startDate: null,
    endDate: null,
  },
];
