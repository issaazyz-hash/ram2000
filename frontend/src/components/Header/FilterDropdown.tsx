/**
 * FilterDropdown Component
 * 
 * Dropdown menu displaying filters in a responsive grid layout.
 * Supports custom filters from backend and admin controls.
 * 
 * @component
 * @example
 * ```tsx
 * <FilterDropdown 
 *   filters={filters} 
 *   isOpen={isOpen} 
 *   onClose={handleClose} 
 *   isAdmin={isAdmin} 
 * />
 * ```
 */

import React from 'react';

interface Filter {
  id: string;
  name: string;
  image?: string;
  url?: string;
}

interface FilterDropdownProps {
  filters: Filter[];
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  filters,
  isOpen,
  onClose,
  isAdmin,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute top-full left-1/2 -translate-x-1/2 mt-8 w-full max-w-[1300px] px-6 bg-[#0f0f0f]/98 backdrop-blur-2xl rounded-2xl shadow-2xl border-2 border-[#F97316]/40 py-8 z-50"
      role="menu"
      aria-label="Filter categories"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {/* Filter items - To be implemented */}
        {filters.map((filter) => (
          <div key={filter.id}>{filter.name}</div>
        ))}
      </div>
    </div>
  );
};

export default FilterDropdown;

