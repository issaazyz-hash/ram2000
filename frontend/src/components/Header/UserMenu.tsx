import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  ShoppingCart, 
  Heart, 
  Package, 
  LayoutDashboard, 
  LogOut,
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const UserMenu: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get cart count from localStorage
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(cart.length);
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    return () => window.removeEventListener('cartUpdated', updateCartCount);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  return (
    <div className="flex items-center gap-3">
      {/* Shopping Cart */}
      <Link
        to="/cart"
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
      >
        <ShoppingCart className="w-6 h-6 text-gray-700" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs 
                           font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {cartCount > 9 ? '9+' : cartCount}
          </span>
        )}
      </Link>

      {/* User Menu */}
      {user ? (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 
                       transition-all duration-200 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full 
                          flex items-center justify-center text-white font-semibold text-sm">
              {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700">
              {user.name || user.email}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-lg 
                          border border-gray-200 py-2 z-50"
                 style={{
                   animation: 'fadeIn 0.2s ease-in-out',
                 }}>
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user.name || 'المستخدم'}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>

              <Link
                to="/account"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 
                         hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
              >
                <User className="w-4 h-4" />
                الملف الشخصي
              </Link>

              <Link
                to="/orders"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 
                         hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
              >
                <Package className="w-4 h-4" />
                الطلبات
              </Link>

              <Link
                to="/favorites"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 
                         hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
              >
                <Heart className="w-4 h-4" />
                المفضلة
              </Link>

              {isAdmin && (
                <Link
                  to="/admin-dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 
                           hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  لوحة التحكم
                </Link>
              )}

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 
                         hover:bg-red-50 transition-colors duration-150"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link
          to="/login"
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white 
                   rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 
                   font-medium text-sm shadow-sm hover:shadow-md"
        >
          تسجيل الدخول
        </Link>
      )}
    </div>
  );
};

export default UserMenu;
