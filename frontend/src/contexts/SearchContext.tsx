import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { searchProducts, getBrandSuggestions, getCategorySuggestions } from '@/api/database';
import { SearchResult, SuggestionItem, SearchFilterType, SearchStats } from '@/types/search';
import { ProductData } from '@/api/database';

interface SearchContextType {
  // State
  searchQuery: string;
  searchResults: SearchResult[];
  suggestions: SuggestionItem[];
  isLoading: boolean;
  resultsCount: number;
  activeFilter: SearchFilterType;
  searchStats?: SearchStats;
  
  // Functions
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  getSuggestions: (query: string) => Promise<void>;
  filterResults: (type: SearchFilterType) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQueryState] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultsCount, setResultsCount] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<SearchFilterType>('all');
  const [searchStats, setSearchStats] = useState<SearchStats | undefined>();
  
  const navigate = useNavigate();
  const location = useLocation();
  const isInitialMount = useRef(true);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const currentSearchIdRef = useRef<number>(0);

  console.log('🔍 SearchContext: Initialized');

  /**
   * 🔍 تنفيذ البحث المتقدم
   * - ينتظر searchProducts() بشكل صحيح
   * - يمنع race conditions
   * - يستخدم أحدث قائمة المنتجات دائماً
   */
  const performSearch = useCallback(async (query: string): Promise<void> => {
    // إلغاء البحث السابق إن وجد
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }

    // إنشاء AbortController جديد لهذا البحث
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;
    
    // زيادة ID البحث لتتبع أحدث بحث
    const searchId = ++currentSearchIdRef.current;

    // تطبيع الاستعلام
    const normalizedQuery = query.trim();
    
    if (!normalizedQuery) {
      console.log('🔍 SearchContext: Empty query, clearing results');
      setSearchResults([]);
      setResultsCount(0);
      setSuggestions([]);
      setIsLoading(false);
      setSearchStats(undefined);
      return;
    }

    console.log('🔍 SearchContext: Starting search for:', normalizedQuery, '(ID:', searchId, ')');
    setIsLoading(true);
    const startTime = performance.now();

    try {
      // تنفيذ البحث مع انتظار النتيجة
      const results = await searchProducts(normalizedQuery);
      
      // التحقق من أن هذا البحث هو الأحدث (لم يتم إلغاؤه)
      if (searchId !== currentSearchIdRef.current) {
        console.log('🔍 SearchContext: Search cancelled (newer search started)');
        return;
      }
      
      // التحقق من عدم إلغاء البحث
      if (abortController.signal.aborted) {
        console.log('🔍 SearchContext: Search aborted');
        return;
      }
      
      console.log('🔍 SearchContext: Search completed, found', results.length, 'results');
      
      // حساب الإحصائيات
      const searchTime = performance.now() - startTime;
      const productsCount = results.length;
      const brandsCount = new Set(results.map(r => r.product.brand)).size;
      const categoriesCount = new Set(results.map(r => r.product.category)).size;
      
      const stats: SearchStats = {
        totalResults: productsCount,
        productsCount,
        brandsCount,
        categoriesCount,
        searchTime,
      };
      
      // تحديث الحالة فقط إذا كان هذا هو أحدث بحث
      if (searchId === currentSearchIdRef.current && !abortController.signal.aborted) {
        setSearchResults(results);
        setResultsCount(productsCount);
        setSearchStats(stats);
        console.log('🔍 SearchContext: Search stats:', stats);
      }
    } catch (error: any) {
      // تجاهل الأخطاء الناتجة عن الإلغاء
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        console.log('🔍 SearchContext: Search was aborted');
        return;
      }
      
      console.error('🔍 SearchContext: Error performing search:', error);
      
      // تحديث الحالة فقط إذا كان هذا هو أحدث بحث
      if (searchId === currentSearchIdRef.current) {
        setSearchResults([]);
        setResultsCount(0);
        setSearchStats(undefined);
      }
    } finally {
      // تحديث حالة التحميل فقط إذا كان هذا هو أحدث بحث
      if (searchId === currentSearchIdRef.current && !abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * 🔍 الحصول على الاقتراحات الذكية
   */
  const getSuggestions = useCallback(async (query: string): Promise<void> => {
    const normalizedQuery = query.trim();
    
    if (!normalizedQuery || normalizedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    console.log('🔍 SearchContext: Getting suggestions for:', normalizedQuery);
    
    try {
      const suggestionItems: SuggestionItem[] = [];

      // 1. اقتراحات من المنتجات (أهم 5)
      const productResults = await searchProducts(normalizedQuery);
      const topProducts = productResults.slice(0, 5);
      
      topProducts.forEach((result) => {
        suggestionItems.push({
          id: `product_${result.product.id}`,
          text: result.product.name,
          source: 'product',
          icon: '🔧',
          score: result.score,
          metadata: {
            brand: result.product.brand,
            category: result.product.category,
          },
        });
      });

      // 2. اقتراحات من العلامات التجارية (أهم 3)
      const brands = await getBrandSuggestions(normalizedQuery, 3);
      brands.forEach((brand: any) => {
        if (!suggestionItems.find(s => s.text === brand.name)) {
          suggestionItems.push({
            id: `brand_${brand.id || brand.name}`,
            text: brand.name,
            source: 'brand',
            icon: '🚗',
            metadata: {
              count: 0,
            },
          });
        }
      });

      // 3. اقتراحات من الفئات (أهم 3)
      const categories = await getCategorySuggestions(normalizedQuery, 3);
      categories.forEach((category: string) => {
        if (!suggestionItems.find(s => s.text === category)) {
          suggestionItems.push({
            id: `category_${category}`,
            text: category,
            source: 'category',
            icon: '📦',
            metadata: {
              count: 0,
            },
          });
        }
      });

      // ترتيب الاقتراحات حسب الأفضلية
      suggestionItems.sort((a, b) => {
        if (b.score && a.score) return b.score - a.score;
        if (b.score) return 1;
        if (a.score) return -1;
        return 0;
      });

      // الحد الأقصى 10 اقتراحات
      const finalSuggestions = suggestionItems.slice(0, 10);
      
      console.log('🔍 SearchContext: Generated', finalSuggestions.length, 'suggestions');
      setSuggestions(finalSuggestions);
    } catch (error) {
      console.error('🔍 SearchContext: Error getting suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  /**
   * 🔍 تصفية النتائج حسب النوع
   */
  const filterResults = useCallback((type: SearchFilterType) => {
    console.log('🔍 SearchContext: Filtering results by:', type);
    setActiveFilter(type);
  }, []);

  // Load search query from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryParam = params.get('search') || params.get('query');
    
    if (queryParam && queryParam !== searchQuery) {
      console.log('🔍 SearchContext: Found search query in URL:', queryParam);
      setSearchQueryState(queryParam);
      performSearch(queryParam).catch(console.error);
    } else if (!queryParam && searchQuery && !isInitialMount.current) {
      console.log('🔍 SearchContext: Clearing search - no query in URL');
      setSearchQueryState('');
      setSearchResults([]);
      setResultsCount(0);
      setSuggestions([]);
      setSearchStats(undefined);
    }
    
    isInitialMount.current = false;
  }, [location.search]); // Only depend on location.search

  // Debounced search when query changes (for live search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        console.log('🔍 SearchContext: Performing live search for:', searchQuery);
        performSearch(searchQuery).catch(console.error);
        getSuggestions(searchQuery).catch(console.error);
      } else {
        setSearchResults([]);
        setResultsCount(0);
        setSuggestions([]);
        setSearchStats(undefined);
      }
    }, 300); // 300ms debounce for live search

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery, performSearch, getSuggestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
    };
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    console.log('🔍 SearchContext: Setting search query:', query);
    setSearchQueryState(query);
    
    // Update URL if we're on search results page
    if (location.pathname === '/search') { // Removed: /catalogue path - catalogue page deleted
      const params = new URLSearchParams(location.search);
      if (query.trim()) {
        params.set('search', query);
      } else {
        params.delete('search');
        params.delete('query');
      }
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const clearSearch = useCallback(() => {
    console.log('🔍 SearchContext: Clearing search');
    
    // إلغاء البحث الجاري
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    
    setSearchQueryState('');
    setSearchResults([]);
    setResultsCount(0);
    setSuggestions([]);
    setActiveFilter('all');
    setSearchStats(undefined);
    
    // Clear URL parameter
    if (location.pathname === '/search') { // Removed: /catalogue path - catalogue page deleted
      const params = new URLSearchParams(location.search);
      params.delete('search');
      params.delete('query');
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        searchResults,
        suggestions,
        isLoading,
        resultsCount,
        activeFilter,
        searchStats,
        setSearchQuery,
        performSearch,
        clearSearch,
        getSuggestions,
        filterResults,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
