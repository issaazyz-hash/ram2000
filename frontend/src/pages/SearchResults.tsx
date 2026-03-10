import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSearch } from "@/contexts/SearchContext";
import { SearchResult, SearchFilterType } from "@/types/search";
import { Package, Car, Tag, Filter } from "lucide-react";

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    searchQuery, 
    searchResults, 
    isSearching, 
    performSearch,
    activeFilter,
    filterResults,
    resultsCount,
    searchStats,
    suggestions
  } = useSearch();
  const [user, setUser] = useState<any>(null);

  console.log('🔍 SearchResults: Component rendered');
  console.log('🔍 SearchResults: searchQuery:', searchQuery);
  console.log('🔍 SearchResults: searchResults:', searchResults.length);
  console.log('🔍 SearchResults: isSearching:', isSearching);
  console.log('🔍 SearchResults: activeFilter:', activeFilter);
  console.log('🔍 SearchResults: searchStats:', searchStats);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Perform search if query exists in URL
    const queryParam = searchParams.get('search') || searchParams.get('query');
    if (queryParam && queryParam !== searchQuery) {
      console.log('🔍 SearchResults: Found query in URL, performing search:', queryParam);
      performSearch(queryParam);
    }
  }, [searchParams, searchQuery, performSearch]);

  // Filter results based on activeFilter
  const filteredResults = searchResults.filter((result: SearchResult) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'products') return true; // All search results are products
    return false;
  });

  // Get match type badge color
  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-blue-100 text-blue-700';
      case 'fuzzy':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getMatchTypeLabel = (matchType: string) => {
    switch (matchType) {
      case 'exact':
        return 'تطابق تام';
      case 'partial':
        return 'تطابق جزئي';
      case 'fuzzy':
        return 'مشابه';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header />
      
      <main className="pt-20 sm:pt-24 md:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              نتائج البحث
            </h1>
            {searchQuery && (
              <div className="space-y-2">
                <p className="text-gray-600">
                  البحث عن: <span className="font-semibold text-orange-500">{searchQuery}</span>
                </p>
                {searchStats && (
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>تم البحث في {searchStats.searchTime.toFixed(0)}ms</span>
                    {searchStats.brandsCount > 0 && (
                      <span>• {searchStats.brandsCount} علامة تجارية</span>
                    )}
                    {searchStats.categoriesCount > 0 && (
                      <span>• {searchStats.categoriesCount} فئة</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter Buttons */}
          {searchResults.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => filterResults('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeFilter === 'all'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                الكل ({resultsCount})
              </button>
              <button
                onClick={() => filterResults('products')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeFilter === 'products'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Package className="w-4 h-4" />
                المنتجات ({resultsCount})
              </button>
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              <p className="mt-4 text-gray-600">جاري البحث...</p>
            </div>
          )}

          {/* Results */}
          {!isSearching && (
            <>
              {filteredResults.length > 0 ? (
                <>
                  <p className="text-gray-600 mb-6">
                    تم العثور على {filteredResults.length} منتج
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                    {filteredResults.map((result: SearchResult) => {
                      const product = result.product;
                      return (
                        <div
                          key={product.id}
                          className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer relative"
                          // onClick={() => navigate('/catalogue')} // Removed: catalogue page deleted
                        >
                          {/* Match Type Badge */}
                          <div className={`absolute top-2 right-2 z-10 px-2 py-1 rounded text-xs font-medium ${getMatchTypeColor(result.matchType)}`}>
                            {getMatchTypeLabel(result.matchType)}
                          </div>
                          
                          {/* Score Badge */}
                          {result.score > 0 && (
                            <div className="absolute top-2 left-2 z-10 bg-gray-900 text-white px-2 py-1 rounded text-xs font-medium">
                              {Math.round(result.score)}%
                            </div>
                          )}

                          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="text-gray-400 text-center">
                                  <div className="text-4xl mb-2">🔧</div>
                                  <div className="text-sm font-semibold">{product.brand || 'OEM'}</div>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="p-4 sm:p-5 md:p-6">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 line-clamp-2">
                              {product.name}
                            </h3>
                            
                            <div className="flex items-center justify-between mb-3 text-xs sm:text-sm text-gray-600">
                              <span>{product.brand || 'OEM'}</span>
                              <span className="text-xs">{product.sku}</span>
                            </div>
                            
                            {/* Matched Field Indicator */}
                            {result.matchedText && (
                              <div className="mb-2 text-xs text-orange-600">
                                مطابق في: <span className="font-medium">{result.matchedField === 'name' ? 'الاسم' : result.matchedField === 'brand' ? 'العلامة' : result.matchedField === 'category' ? 'الفئة' : 'SKU'}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-lg sm:text-xl font-bold text-orange-500">
                                {product.price}
                              </span>
                            </div>
                            
                            {/* Removed: Button navigation to /catalogue - catalogue page deleted */}
                            {/* <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/catalogue');
                              }}
                              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl px-4 py-2.5 sm:py-3 transition-all duration-300 hover:shadow-lg"
                            >
                              عرض التفاصيل
                            </button> */}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : searchQuery ? (
                <div className="text-center py-24">
                  <div className="text-8xl mb-6 opacity-30">🔍</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">لم يتم العثور على نتائج</h3>
                  <p className="text-gray-600 text-lg mb-8">
                    لم نتمكن من العثور على منتجات تطابق "{searchQuery}"
                  </p>
                  {/* Did you mean suggestions */}
                  {suggestions.length > 0 && (
                    <div className="mb-8">
                      <p className="text-gray-700 font-medium mb-4">هل تقصد:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {suggestions.slice(0, 3).map((suggestion) => (
                          <button
                            key={suggestion.id}
                            onClick={() => {
                              navigate(`/search?search=${encodeURIComponent(suggestion.text)}`);
                              performSearch(suggestion.text);
                            }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                          >
                            {suggestion.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Removed: Button navigation to /catalogue - catalogue page deleted */}
                  {/* <button
                    onClick={() => navigate('/catalogue')}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-6 py-3 transition-all duration-300"
                  >
                    تصفح الكتالوج
                  </button> */}
                </div>
              ) : (
                <div className="text-center py-24">
                  <div className="text-8xl mb-6 opacity-30">🔍</div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">ابدأ البحث</h3>
                  <p className="text-gray-600 text-lg mb-8">
                    استخدم شريط البحث في الأعلى للبحث عن المنتجات
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SearchResults;
