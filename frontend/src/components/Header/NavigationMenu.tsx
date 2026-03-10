import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Home, Package, Filter, Droplets, Wrench, Phone } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  dropdown?: {
    label: string;
    path: string;
  }[];
}

const navItems: NavItem[] = [
  {
    label: 'الرئيسية',
    path: '/',
    icon: <Home className="w-4 h-4" />,
  },
  // Removed: Catalogue menu item - catalogue page deleted
  // {
  //   label: 'الكتالوج',
  //   path: '/catalogue',
  //   icon: <Package className="w-4 h-4" />,
  //   dropdown: [
  //     { label: 'جميع المنتجات', path: '/catalogue' },
  //     { label: 'قطع الغيار', path: '/brand-parts' },
  //     { label: 'الفلاتر', path: '/filtres' },
  //   ],
  // },
  {
    label: 'الفلاتر',
    path: '/filtres',
    icon: <Filter className="w-4 h-4" />,
    dropdown: [
      { label: 'فلاتر الزيت', path: '/filtres?type=oil' },
      { label: 'فلاتر الهواء', path: '/filtres?type=air' },
      { label: 'فلاتر الوقود', path: '/filtres?type=fuel' },
      { label: 'جميع الفلاتر', path: '/filters-catalogue' },
    ],
  },
  {
    label: 'قطع الغيار',
    path: '/brand-parts',
    icon: <Wrench className="w-4 h-4" />,
  },
  {
    label: 'اتصل بنا',
    path: '/contact',
    icon: <Phone className="w-4 h-4" />,
  },
];

const NavigationMenu: React.FC = () => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <nav className="hidden lg:flex items-center gap-1">
      {navItems.map((item) => (
        <div
          key={item.label}
          className="relative"
          onMouseEnter={() => item.dropdown && handleMouseEnter(item.label)}
          onMouseLeave={handleMouseLeave}
        >
          <Link
            to={item.path}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 
                       hover:bg-gray-100 hover:text-blue-600 transition-all duration-200
                       font-medium text-sm group"
          >
            {item.icon && (
              <span className="text-gray-500 group-hover:text-blue-600 transition-colors">
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
            {item.dropdown && (
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                activeDropdown === item.label ? 'rotate-180' : ''
              }`} />
            )}
          </Link>

            {/* Dropdown Menu */}
          {item.dropdown && activeDropdown === item.label && (
            <div
              className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg 
                         border border-gray-200 py-2 z-50"
              style={{
                animation: 'fadeIn 0.2s ease-in-out',
              }}
              onMouseEnter={() => handleMouseEnter(item.label)}
              onMouseLeave={handleMouseLeave}
            >
              {item.dropdown.map((dropdownItem) => (
                <Link
                  key={dropdownItem.path}
                  to={dropdownItem.path}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 
                             hover:text-blue-600 transition-colors duration-150"
                >
                  {dropdownItem.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
};

export default NavigationMenu;

