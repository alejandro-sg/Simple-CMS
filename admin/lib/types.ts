export type Item = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  category: string;
  condition: string;
  type: string;
  description: string;
  status: "In Stock" | "Reserved" | "Sold";
  postStatus: "Draft" | "Published";
  quantity: number;
  featured: boolean;
  price: number | null;
  dimensions: {
    width: number | null;
    depth: number | null;
    height: number | null;
    weight: number | null;
  };
  date: string | null;
  images: string[];
  tags: string[];
  updatedAt: string;
  createdAt: string;
};

export type AdminUser = {
  id: string;
  username: string;
  role: "admin" | "user";
  permissions: string[];
  created_at: string;
};

export const ALL_PERMISSIONS: { key: string; label: string }[] = [
  { key: "items:read",   label: "View items" },
  { key: "items:write",  label: "Create & edit items" },
  { key: "items:delete", label: "Delete items" },
  { key: "items:import", label: "Import CSV" },
  { key: "reviews:read",     label: "View reviews" },
  { key: "reviews:moderate", label: "Moderate reviews (approve/reject/archive)" },
  { key: "reviews:delete",   label: "Delete reviews" },
  { key: "uploads:write",    label: "Upload images" },
  { key: "content:write",    label: "Edit site content" },
];

export type Review = {
  id: string;
  rating: number;
  feedback: string;
  type: string;
  name: string;
  status: "New" | "Approved" | "Rejected" | "Archived";
  created_at: string;
  updated_at: string;
};

export type ItemFormValues = {
  title: string;
  slug: string;
  brand: string;
  category: string;
  condition: string;
  type: string;
  description: string;
  status: "In Stock" | "Reserved" | "Sold";
  postStatus: "Draft" | "Published";
  quantity: number;
  featured: boolean;
  price: number | null;
  dimensions: {
    width: number | null;
    depth: number | null;
    height: number | null;
    weight: number | null;
  };
  date: string | null;
  images: string[];
};

export type SiteContent = {
  brand: {
    name: string;
    logoAlt: string;
    logoUrl: string;
    navLines: [string, string];
    tagline: string;
    email: string;
    facebookLink: string;
    instagramLink: string;
  };
  location: {
    address: string;
    mapLink: string;
    visitLabel: string;
    hours: string;
    phone: string;
  };
  home: {
    eyebrow: string;
    headline: string;
    serviceAreaLine: string;
    description: string;
    trustLine: string;
    instagramCta: string;
    instagramLink: string;
    ctaPrimary: string;
    ctaSecondary: string;
    newArrivalsTitle: string;
    featuredTitle: string;
    categoriesTitle: string;
    categories: Array<{ title: string; detail: string }>;
    howItWorksTitle: string;
    howItWorks: Array<{ title: string; detail: string }>;
    curationTitle: string;
    curationDetail: string;
    storeInfo: string;
    emptyArrivals: string;
    localIntent: string;
    visitCta: string;
    testimonialsTitle: string;
    testimonials: Array<{ name: string; location: string; quote: string }>;
    waitlistTitle: string;
    waitlistDescription: string;
    waitlistPlaceholder: string;
    waitlistButton: string;
    heroImage: string;
    storyImage: string;
  };
  shop: {
    title: string;
    description: string;
    filters: {
      categoryLabel: string;
      typeLabel: string;
      applyLabel: string;
      clearLabel: string;
    };
    searchPlaceholder: string;
    emptyMessage: string;
    reserveCta: string;
    smsCta: string;
    emailCta: string;
    similarCta: string;
    smsNumber: string;
    smsTemplate: string;
  };
  decor: {
    eyebrow: string;
    title: string;
    description: string;
    items: string[];
  };
  contact: {
    eyebrow: string;
    title: string;
    description: string;
    addressLabel: string;
    hoursLabel: string;
    serviceAreaIntro: string;
    nearbyAreasTitle: string;
    nearbyAreas: string[];
    form: {
      nameLabel: string;
      namePlaceholder: string;
      emailLabel: string;
      emailPlaceholder: string;
      phoneLabel: string;
      phonePlaceholder: string;
      pickupDeliveryLabel: string;
      pickupDeliveryOptions: string[];
      zipLabel: string;
      zipPlaceholder: string;
      detailsLabel: string;
      detailsPlaceholder: string;
      submitLabel: string;
      successMessage: string;
      errorMessage: string;
    };
  };
  about: {
    title: string;
    intro: string;
    story: string;
    valuesTitle: string;
    values: string[];
    ownersTitle: string;
    ownersDescription: string;
    ownersImageAlt: string;
    storefrontImage: string;
    ownersImage: string;
  };
  nav: {
    home: string;
    shop: string;
    contact: string;
    about: string;
  };
};
