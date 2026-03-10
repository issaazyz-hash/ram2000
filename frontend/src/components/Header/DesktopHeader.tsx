/**
 * DesktopHeader Component
 * 
 * ⚠️ CURRENTLY UNUSED - KEPT FOR FUTURE REFACTORING
 * 
 * This component provides a clean, modular desktop header implementation.
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
import SearchBar from './SearchBar';
import NavigationMenu from './NavigationMenu';
import UserMenu from './UserMenu';

interface DesktopHeaderProps {
  isScrolled: boolean;
}

const DesktopHeader: React.FC<DesktopHeaderProps> = ({ isScrolled }) => {
  return (
    <>
      {/* Main Header */}
      <header
        className={`hidden lg:block bg-white border-b border-gray-200 transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : 'shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between gap-6 py-4">
            {/* Logo Section */}
            <Link
              to="/"
              className="flex items-center gap-3 flex-shrink-0 group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg 
                            flex items-center justify-center text-white font-bold text-xl 
                            shadow-lg group-hover:shadow-xl transition-all duration-300 
                            group-hover:scale-105">
                RA
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 
                               transition-colors">
                  Rannen Auto
                </span>
                <span className="text-xs text-gray-500">Motors</span>
              </div>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <SearchBar />
            </div>

            {/* Navigation & User Menu */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <NavigationMenu />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default DesktopHeader;
