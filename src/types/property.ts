export type PropertyPurpose = "sale" | "rent";
export type PropertyStatus = "available" | "sold" | "rented" | "pending";

export interface PropertyType {
  id: string;
  name: string;
  icon: string;
  active: boolean;
}

export interface PropertyAmenity {
  id: string;
  name: string;
  icon: string;
}

export interface PropertyImage {
  id: string;
  url: string;
  alt: string;
  order: number;
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  bio: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    whatsapp?: string;
  };
  propertiesCount: number;
  rating: number;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: string;
  purpose: PropertyPurpose;
  status: PropertyStatus;
  price: number;
  currency: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  garages: number;
  address: string;
  city: string;
  state: string;
  neighborhood: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  images: PropertyImage[];
  amenities: string[];
  featured: boolean;
  agent: Agent;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFilters {
  query: string;
  type: string;
  purpose: PropertyPurpose | "";
  minPrice: number;
  maxPrice: number;
  bedrooms: number;
  bathrooms: number;
  garages: number;
  city: string;
  sortBy: "newest" | "oldest" | "price_asc" | "price_desc" | "featured";
}

export type ViewMode = "grid" | "list" | "map";
