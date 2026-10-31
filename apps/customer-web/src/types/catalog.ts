export interface ICategory {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface IProduct {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  brand?: string;
  description?: string;
  category: ICategory | string;
  sku?: string;
  price: number;
  discountedPrice?: number;
  unit: string;
  stockQuantity: number;
  images: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  tags: string[];
  createdAt?: string;
}

export interface IPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
