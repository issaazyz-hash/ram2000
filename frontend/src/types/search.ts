import { ProductData } from '@/api/database';
import { CarBrandData } from '@/api/database';

/**
 * 🔍 Search Types - أنواع البيانات لمحرك البحث المتقدم
 */

// نوع المطابقة
export type MatchType = 'exact' | 'partial' | 'fuzzy';

// نوع التصفية
export type SearchFilterType = 'all' | 'products' | 'brands' | 'categories';

// نوع المصدر للاقتراح
export type SuggestionSource = 'product' | 'brand' | 'category';

// نتيجة البحث مع الدرجة
export interface SearchResult {
  product: ProductData;
  score: number; // 0-100
  matchType: MatchType;
  matchedField: 'name' | 'brand' | 'category' | 'sku';
  matchedText?: string; // النص المطابق
}

// عنصر اقتراح
export interface SuggestionItem {
  id: string;
  text: string;
  source: SuggestionSource;
  icon?: string;
  score?: number;
  metadata?: {
    brand?: string;
    category?: string;
    count?: number; // عدد المنتجات في هذه الفئة/العلامة
  };
}

// حالة البحث الكاملة
export interface SearchState {
  query: string;
  results: SearchResult[];
  suggestions: SuggestionItem[];
  isLoading: boolean;
  resultsCount: number;
  activeFilter: SearchFilterType;
  error?: string;
}

// خيارات البحث الذكي
export interface FuzzySearchOptions {
  threshold?: number; // 0.0 - 1.0 (افتراضي: 0.6)
  distance?: number; // Levenshtein distance (افتراضي: 100)
  minMatchCharLength?: number; // الحد الأدنى لطول المطابقة (افتراضي: 2)
}

// إحصائيات البحث
export interface SearchStats {
  totalResults: number;
  productsCount: number;
  brandsCount: number;
  categoriesCount: number;
  searchTime: number; // بالمللي ثانية
}

