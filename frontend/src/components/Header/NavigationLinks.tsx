/**
 * NavigationLinks Component
 * 
 * Quick navigation links bar displayed below main header.
 * Includes Accueil, Catalogue, Promotions, Favoris, Contact.
 * 
 * @component
 * @example
 * ```tsx
 * <NavigationLinks />
 * ```
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Home, FileText, Tag, Heart, MessageCircle } from 'lucide-react';

const NavigationLinks: React.FC = () => {
  const links = [
    { to: '/', label: 'Accueil', icon: Home },
    // { to: '/catalogue', label: 'Catalogue', icon: FileText }, // Removed: catalogue page deleted
    { to: '#promotions', label: 'Promotions', icon: Tag },
    { to: '#favoris', label: 'Favoris', icon: Heart },
    { to: '#contact', label: 'Contact', icon: MessageCircle },
  ];

  return (
    <nav 
      className="hidden lg:block border-t border-[#F97316]/30 pt-4 pb-4"
      role="navigation"
      aria-label="Quick navigation links"
    >
      <div className="flex items-center justify-center gap-8 lg:gap-10 xl:gap-12">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-transparent border border-transparent hover:bg-[#F97316]/20 hover:border-[#F97316]/50 text-white/90 hover:text-[#F97316] transition-all duration-300 text-base lg:text-lg font-semibold"
            >
              <Icon className="w-6 h-6" aria-hidden="true" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default NavigationLinks;

