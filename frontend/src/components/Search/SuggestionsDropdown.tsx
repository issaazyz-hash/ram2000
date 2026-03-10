import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SuggestionItem } from '@/types/search';
import { Search, Package, Car, Tag } from 'lucide-react';

interface SuggestionsDropdownProps {
  suggestions: SuggestionItem[];
  onSelect: (suggestion: SuggestionItem) => void;
  query: string;
  isVisible: boolean;
}

const SuggestionsDropdown: React.FC<SuggestionsDropdownProps> = ({
  suggestions,
  onSelect,
  query,
  isVisible,
}) => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);

  // إعادة تعيين الفهرس عند تغيير الاقتراحات
  React.useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // معالجة لوحة المفاتيح
  React.useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        onSelect(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, suggestions, selectedIndex, onSelect]);

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  const getIcon = (source: string) => {
    switch (source) {
      case 'product':
        return <Package className="w-4 h-4" />;
      case 'brand':
        return <Car className="w-4 h-4" />;
      case 'category':
        return <Tag className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'product':
        return 'منتج';
      case 'brand':
        return 'علامة تجارية';
      case 'category':
        return 'فئة';
      default:
        return '';
    }
  };

  return (
    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
      <div className="p-2">
        {/* Header */}
        <div className="text-xs text-gray-500 px-3 py-2 border-b font-medium">
          اقتراحات ({suggestions.length})
        </div>

        {/* Suggestions List */}
        <div className="py-1">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => onSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-right px-3 py-2.5 rounded-md transition-colors flex items-center gap-3 ${
                selectedIndex === index
                  ? 'bg-orange-50 text-orange-700'
                  : 'hover:bg-gray-50 text-gray-900'
              }`}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 ${
                selectedIndex === index ? 'text-orange-500' : 'text-gray-400'
              }`}>
                {getIcon(suggestion.source)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {suggestion.text}
                </div>
                {suggestion.metadata && (
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    {suggestion.metadata.brand && (
                      <span>{suggestion.metadata.brand}</span>
                    )}
                    {suggestion.metadata.category && (
                      <span>• {suggestion.metadata.category}</span>
                    )}
                    {suggestion.metadata.count !== undefined && suggestion.metadata.count > 0 && (
                      <span>({suggestion.metadata.count})</span>
                    )}
                  </div>
                )}
              </div>

              {/* Source Badge */}
              <div className="flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  suggestion.source === 'product'
                    ? 'bg-blue-100 text-blue-700'
                    : suggestion.source === 'brand'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {getSourceLabel(suggestion.source)}
                </span>
              </div>

              {/* Score (if available) */}
              {suggestion.score !== undefined && (
                <div className="flex-shrink-0 text-xs text-gray-400">
                  {Math.round(suggestion.score)}%
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-400 px-3 py-2 border-t text-center">
          استخدم الأسهم للتنقل • Enter للاختيار • Esc للإغلاق
        </div>
      </div>
    </div>
  );
};

export default SuggestionsDropdown;

