/**
 * FilterMenuItem Component
 * 
 * Individual filter item in the dropdown menu.
 * Displays icon and label with click/hover states.
 * 
 * @component
 * @example
 * ```tsx
 * <FilterMenuItem 
 *   filter={filter} 
 *   onClick={handleClick} 
 *   isActive={isActive} 
 *   isAdmin={isAdmin} 
 * />
 * ```
 */

import React, { memo } from 'react';

interface Filter {
  id: string;
  name: string;
  image?: string;
  url?: string;
}

interface FilterMenuItemProps {
  filter: Filter;
  onClick: () => void;
  isActive: boolean;
  isAdmin: boolean;
}

const FilterMenuItem: React.FC<FilterMenuItemProps> = memo(({
  filter,
  onClick,
  isActive,
  isAdmin,
}) => {
  return (
    <button
      onClick={onClick}
      className={`filter-menu-item ${isActive ? 'active' : ''}`}
      role="menuitem"
      aria-label={`Filter: ${filter.name}`}
      data-testid={`filter-item-${filter.id}`}
    >
      {filter.image && (
        <img 
          src={filter.image} 
          alt={filter.name}
          loading="lazy"
          className="w-[clamp(64px,4vw,100px)] h-[clamp(64px,4vw,100px)] rounded-full object-cover"
        />
      )}
      <span className="text-[clamp(0.875rem,0.75vw,1.125rem)] font-semibold">
        {filter.name}
      </span>
    </button>
  );
});

FilterMenuItem.displayName = 'FilterMenuItem';

export default FilterMenuItem;

