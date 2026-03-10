/**
 * Filter Types
 * 
 * Type definitions for filter-related entities.
 */

/**
 * Filter Category Enum
 */
export enum FilterCategory {
  FILTRE = 'Filtre',
  FREIN = 'Frein',
  SUSPENSION = 'Suspension',
  COURROIE = 'Courroie',
  CARROSSERIE = 'Carrosserie',
  MOTEUR = 'Moteur',
  AMORTISSEMENT = 'Amortissement',
}

/**
 * Filter Interface
 */
export interface Filter {
  id: string;
  name: string;
  image?: string;
  url?: string;
  icon?: string;
  color?: string;
  links?: FilterLink[];
  dropdownOpen?: boolean;
  category?: FilterCategory;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Filter Link Interface
 */
export interface FilterLink {
  id: string;
  name: string;
  image?: string;
  url: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create Filter DTO
 */
export interface CreateFilterDto {
  name: string;
  image?: string;
  url?: string;
  icon?: string;
  color?: string;
  category?: FilterCategory;
}

/**
 * Update Filter DTO
 */
export interface UpdateFilterDto extends Partial<CreateFilterDto> {
  name?: string;
}

/**
 * Create Link DTO
 */
export interface CreateLinkDto {
  name: string;
  image?: string;
  url: string;
}

/**
 * Update Link DTO
 */
export interface UpdateLinkDto extends Partial<CreateLinkDto> {}

