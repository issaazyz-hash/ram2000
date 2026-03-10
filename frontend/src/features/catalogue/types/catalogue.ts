// TypeScript interfaces for Catalogue feature

export interface CatalogueCarData {
  id?: string;
  name: string;
  brand: string;
  model: string;
  description: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  image: string;
  images?: string[];
  year?: number;
  category?: string;
}

export interface NewCarFormData {
  name: string;
  brand: string;
  model: string;
  description: string;
  image: string;
}

export interface CatalogueState {
  cars: CatalogueCarData[];
  isLoading: boolean;
  error: string | null;
}

export interface AdminState {
  isAdmin: boolean;
  isAddModalOpen: boolean;
  isSaving: boolean;
}

