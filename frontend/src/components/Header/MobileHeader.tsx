/**
 * MobileHeader Component
 * 
 * ⚠️ CURRENTLY UNUSED - KEPT FOR FUTURE REFACTORING
 * 
 * This component provides a clean, modular mobile header implementation.
 * It's designed to be used as part of a refactored Header architecture.
 * 
 * STATUS: Not currently used. The main Header.tsx contains the actual
 * implementation being used throughout the application.
 * 
 * USED BY: Header_NEW.tsx (which is also unused)
 * 
 * PURPOSE: This component is kept as a reference for future refactoring
 * to split the large Header.tsx into smaller, more maintainable components.
 * 
 * @component
 * @deprecated Not used - kept for reference only
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, ShoppingCart } from 'lucide-react';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import MobileNav from './MobileNav';

interface MobileHeaderProps {
  isScrolled: boolean;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ 
  isScrolled, 
  menuOpen, 
  setMenuOpen 
}) => {
  const [cartCount, setCartCount] = React.useState(0);

  React.useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(cart.length);
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    return () => window.removeEventListener('cartUpdated', updateCartCount);
  }, []);

  return (
    <>
      {/* Main Header - Fixed height for mobile */}
      <header
        className={`lg:hidden bg-white border-b border-gray-200 transition-shadow duration-300 sticky top-0 z-50 ${
          isScrolled ? 'shadow-md' : 'shadow-sm'
        }`}
      >
        <div className="px-3 sm:px-4 py-2 sm:py-3 max-w-full overflow-hidden">
          {/* Top Row - Logo, Menu, Cart */}
          <div className="flex items-center justify-between gap-2 sm:gap-3 min-h-[48px] sm:min-h-[56px]">
            {/* Menu Button - Touch friendly */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 sm:p-2.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </button>

            {/* Logo - Responsive sizing */}
            <Link
              to="/"
              className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 group min-w-0"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg 
                            flex items-center justify-center text-white font-bold text-sm sm:text-lg 
                            shadow-md group-hover:shadow-lg transition-all duration-300 flex-shrink-0">
                RA
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-lg font-bold text-gray-900 group-hover:text-blue-600 
                               transition-colors truncate">
                  Rannen Auto
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-500">Motors</span>
              </div>
            </Link>

            {/* Cart & User - Compact layout */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Link
                to="/cart"
                className="relative p-2 sm:p-2.5 rounded-lg hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Shopping cart"
              >
                <ShoppingCart className="w-5 h-5 text-gray-700" />
                {cartCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:-top-1 sm:-right-1 bg-red-500 text-white text-[9px] sm:text-[10px] 
                                 font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
              <UserMenu />
            </div>
          </div>

          {/* Search Bar - Full width below header on mobile */}
          <div className="mt-2 sm:mt-3 w-full">
            <SearchBar className="w-full" />
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNav isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
};

export default MobileHeader;
