/**
 * SideMenu Component
 * 
 * Full-screen overlay menu for mobile devices.
 * Includes nested categories with expand/collapse functionality.
 * 
 * @component
 * @example
 * ```tsx
 * <SideMenu 
 *   isOpen={isOpen} 
 *   onClose={handleClose} 
 *   filters={filters} 
 *   user={user} 
 * />
 * ```
 */

import React from 'react';
import { X } from 'lucide-react';

interface Filter {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Filter[];
  user: User | null;
}

const SideMenu: React.FC<SideMenuProps> = ({
  isOpen,
  onClose,
  filters,
  user,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <div className="flex flex-col h-full">
        <header className="flex items-center justify-between p-6 border-b border-[#F97316]/30">
          <h2 className="text-xl font-bold">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#F97316]/20 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </header>
        
        <nav className="flex-1 overflow-y-auto p-6">
          {/* Menu content - To be implemented */}
          <div>Side Menu Content - To be implemented</div>
        </nav>
      </div>
    </div>
  );
};

export default SideMenu;

