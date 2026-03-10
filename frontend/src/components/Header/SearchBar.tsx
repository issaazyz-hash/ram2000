import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '@/contexts/SearchContext';
import SuggestionsDropdown from '@/components/Search/SuggestionsDropdown';
import { SuggestionItem } from '@/types/search';

interface SearchBarProps {
  className?: string;
  onSearch?: (query: string) => void;
}

// Safe hook wrapper to prevent crashes if provider is missing
const useSearchSafe = () => {
  try {
    return useSearch();
  } catch (error) {
    // Provider not available - return safe defaults
    console.warn('🔍 SearchBar: SearchProvider not available, using safe fallback');
    return {
      searchQuery: '',
      setSearchQuery: () => {},
      performSearch: async () => {},
      clearSearch: () => {},
      getSuggestions: async () => {},
      filterResults: () => {},
      suggestions: [],
      resultsCount: 0,
      isLoading: false,
      activeFilter: 'all' as const,
      searchResults: [],
    };
  }
};

const SearchBar: React.FC<SearchBarProps> = ({ className = '', onSearch }) => {
  const [localQuery, setLocalQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const searchContext = useSearchSafe();
  const { 
    searchQuery, 
    setSearchQuery, 
    performSearch, 
    suggestions,
    resultsCount,
    isLoading 
  } = searchContext;
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync local query with context
  useEffect(() => {
    if (searchQuery !== localQuery) {
      setLocalQuery(searchQuery);
    }
  }, [searchQuery]);

  // إغلاق الاقتراحات عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * 🔍 Debounced search function
   * - 300ms debounce
   * - Live search while typing
   * - Calls performSearch() correctly
   */
  const handleSearchChange = useCallback((value: string) => {
    setLocalQuery(value);
    setShowSuggestions(value.length > 0);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // Update context immediately for UI responsiveness
    setSearchQuery(value);

    // Perform search after debounce delay
    if (value.trim().length > 0) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(value.trim()).catch((error) => {
          console.error('🔍 SearchBar: Error in debounced performSearch:', error);
        });
      }, 300); // 300ms debounce
    } else {
      // Clear results if query is empty
      setSearchQuery('');
    }
  }, [setSearchQuery, performSearch]);

  /**
   * 🔍 Handle form submission
   * - Clears debounce timer
   * - Performs search immediately
   * - Navigates to search results page
   */
  const handleSubmit = useCallback((e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const query = localQuery.trim();
    
    if (!query) {
      return;
    }
    
    // Clear debounce timer if exists
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // Update context
    setSearchQuery(query);
    
    // Perform search immediately
    performSearch(query).then(() => {
      // Navigate to search results page after search completes
      navigate(`/search?search=${encodeURIComponent(query)}`);
      
      if (onSearch) {
        onSearch(query);
      }
      
      setShowSuggestions(false);
      inputRef.current?.blur();
    }).catch((error) => {
      console.error('🔍 SearchBar: Error in performSearch:', error);
    });
  }, [localQuery, setSearchQuery, performSearch, navigate, onSearch]);

  const handleClear = useCallback(() => {
    setLocalQuery('');
    setSearchQuery('');
    setShowSuggestions(false);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    inputRef.current?.focus();
  }, [setSearchQuery]);

  const handleSuggestionSelect = useCallback((suggestion: SuggestionItem) => {
    setLocalQuery(suggestion.text);
    setSearchQuery(suggestion.text);
    
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // Perform search immediately
    performSearch(suggestion.text).then(() => {
      navigate(`/search?search=${encodeURIComponent(suggestion.text)}`);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }).catch((error) => {
      console.error('🔍 SearchBar: Error in suggestion search:', error);
    });
  }, [setSearchQuery, performSearch, navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form 
        onSubmit={handleSubmit}
        className="relative w-full"
      >
        <div className="relative w-full">
          {/* Search Icon Button - Clickable, Touch-friendly */}
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
            className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 p-1.5 sm:p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-all cursor-pointer z-10 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Search"
            title="بحث"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(e);
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                inputRef.current?.blur();
              }
            }}
            onFocus={() => {
              if (localQuery.length > 0 || suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Rechercher des pièces..."
            className="w-full pl-3 sm:pl-4 pr-10 sm:pr-12 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
                     transition-all duration-200 text-gray-700 placeholder-gray-400
                     hover:border-gray-300 text-right text-sm sm:text-base min-h-[44px]"
            dir="rtl"
          />
          
          {localQuery && (
            <>
              <button
                type="button"
                onClick={handleClear}
                className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center"
                aria-label="Clear search"
                title="مسح"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              
              {/* Results Count Badge - Hidden on very small screens */}
              {resultsCount > 0 && !isLoading && (
                <div className="absolute left-8 sm:left-12 top-1/2 transform -translate-y-1/2 z-10 hidden xs:block">
                  <span className="text-[10px] sm:text-xs bg-orange-100 text-orange-700 px-1.5 sm:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    {resultsCount}
                  </span>
                </div>
              )}
              
              {/* Loading Indicator */}
              {isLoading && (
                <div className="absolute left-8 sm:left-12 top-1/2 transform -translate-y-1/2 z-10">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      <SuggestionsDropdown
        suggestions={suggestions}
        onSelect={handleSuggestionSelect}
        query={localQuery}
        isVisible={showSuggestions && (suggestions.length > 0 || localQuery.length > 0)}
      />
    </div>
  );
};

export default SearchBar;
