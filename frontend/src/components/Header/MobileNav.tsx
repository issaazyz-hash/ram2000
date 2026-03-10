import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Package, 
  Phone,
  X,
  User,
  ShoppingCart,
  Heart,
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getApiBaseUrl } from '@/utils/apiConfig';
import { useToast } from '@/hooks/use-toast';
import { useFamilles } from '@/hooks/useFamilles';
import FamillesPieces from '@/components/FamillesPieces';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const { toast } = useToast();
  const [cartCount, setCartCount] = useState(0);
  const [updatedImages, setUpdatedImages] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { familles } = useFamilles(isOpen);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(cart.length);
    };

    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    return () => window.removeEventListener('cartUpdated', updateCartCount);
  }, []);


  const handleImageChange = async (familleId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUpdatedImages(prev => ({
      ...prev,
      [familleId]: previewUrl
    }));

    try {
      const formData = new FormData();
      formData.append('image', file);

      const userData = localStorage.getItem('user');
      const headers: HeadersInit = {};
      if (userData) {
        headers['x-user'] = userData;
      }

      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/familles/${familleId}/image`, {
        method: 'PUT',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      if (result.success && result.image) {
        setUpdatedImages(prev => ({
          ...prev,
          [familleId]: result.image
        }));

        toast({
          title: "Succès",
          description: "Image mise à jour avec succès",
        });
        
        window.dispatchEvent(new CustomEvent('famillesUpdated'));
      }
    } catch (error) {
      setUpdatedImages(prev => {
        const newState = { ...prev };
        delete newState[familleId];
        return newState;
      });

      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour l'image",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const navItems = [
    { label: 'Accueil', path: '/', icon: Home },
    // { label: 'Catalogue', path: '/catalogue', icon: Package }, // Removed: catalogue page deleted
    { label: 'Contact', path: '/contact', icon: Phone },
  ];

  const drawerContent = (
    <>
      {/* Overlay - above header (z 9998); portaled to body */}
      <div
        className={`mobile-drawer-overlay fixed inset-0 bg-black/50 lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Drawer panel - above overlay (z 9999); portaled to body */}
      <div
        className={`mobile-drawer-panel fixed top-0 right-0 h-full w-[85vw] max-w-[320px] sm:w-80 bg-black shadow-xl 
                   transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:hidden 
                   overflow-y-auto overflow-x-hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-orange-500 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* User Section */}
        {user ? (
          <div className="p-4 border-b border-white/10 bg-[#0f0f0f]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full 
                            flex items-center justify-center text-white font-semibold">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-semibold text-white">{user.name || 'المستخدم'}</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/cart"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                         bg-white/5 border border-white/10 rounded-lg hover:bg-orange-500/20 
                         transition-colors text-sm font-medium text-white"
              >
                <ShoppingCart className="w-4 h-4" />
                Panier {cartCount > 0 && `(${cartCount})`}
              </Link>
              <Link
                to="/favorites"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                         bg-white/5 border border-white/10 rounded-lg hover:bg-orange-500/20 
                         transition-colors text-sm font-medium text-white"
              >
                <Heart className="w-4 h-4" />
                Favoris
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-white/10">
            <Link
              to="/login"
              onClick={onClose}
              className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 
                       text-white rounded-lg hover:from-orange-600 hover:to-orange-700 
                       transition-all duration-200 font-medium text-sm text-center block"
            >
              Se connecter
            </Link>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-orange-500/20 
                         hover:text-white transition-colors duration-150 border-r-4 
                         border-transparent hover:border-orange-500"
              >
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Familles des pièces */}
        {familles.length > 0 && (
          <div className="border-t border-white/10">
            <FamillesPieces
              familles={familles}
              isAdmin={isAdmin}
              onImageChange={handleImageChange}
              updatedImages={updatedImages}
              variant="list"
              onClose={onClose}
            />
          </div>
        )}

        {/* User Menu Items */}
        {user && (
          <div className="border-t border-white/10 p-4 space-y-2">
            <Link
              to="/account"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-orange-500/20 
                       hover:text-white rounded-lg transition-colors"
            >
              <User className="w-5 h-5 text-gray-400" />
              <span>Profil</span>
            </Link>
            <Link
              to="/orders"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-orange-500/20 
                       hover:text-white rounded-lg transition-colors"
            >
              <Package className="w-5 h-5 text-gray-400" />
              <span>Mes commandes</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin-dashboard"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-orange-500/20 
                         hover:text-white rounded-lg transition-colors"
              >
                <LayoutDashboard className="w-5 h-5 text-gray-400" />
                <span>Tableau de bord</span>
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/20 
                       hover:text-red-300 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
};

export default MobileNav;

