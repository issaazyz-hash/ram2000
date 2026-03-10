import { Link } from "react-router-dom";
import { Heart, User, ShoppingCart, Settings, Menu } from "lucide-react";
import SearchBar from "./Header/SearchBar";
import MobileNav from "./Header/MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useRef } from "react";

const Header = () => {
  const { user } = useAuth();

  const [isMobileHeaderVisible, setIsMobileHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const MOBILE_BREAKPOINT = 768;
    const TOP_VISIBLE_Y = 24;
    const SCROLL_DELTA_THRESHOLD = 8;

    const handleScroll = () => {
      if (window.innerWidth >= MOBILE_BREAKPOINT) {
        if (!isMobileHeaderVisible) setIsMobileHeaderVisible(true);
        return;
      }

      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      // Always show near top for stable first-scroll UX.
      if (currentScrollY <= TOP_VISIBLE_Y) {
        if (!isMobileHeaderVisible) setIsMobileHeaderVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      // Ignore tiny scroll changes to prevent flicker/jitter.
      if (Math.abs(delta) < SCROLL_DELTA_THRESHOLD) {
        return;
      }

      if (delta > 0) {
        if (isMobileHeaderVisible) setIsMobileHeaderVisible(false);
      } else {
        if (!isMobileHeaderVisible) setIsMobileHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobileHeaderVisible]);

  useEffect(() => {
    // Keep header visible while menu drawer is open.
    if (mobileMenuOpen) {
      setIsMobileHeaderVisible(true);
    }
  }, [mobileMenuOpen]);

  return (
    <>
      {/* ================= DESKTOP HEADER ================= */}
      <header className="hidden lg:block bg-black text-white border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-28 lg:h-50 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/ramm.png"
              alt="RAM Auto Parts"
              className="h-10 lg:h-40 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/ram.png";
              }}
            />
          </Link>

          <div className="flex-1 max-w-xl">
            <div className="bg-white rounded-lg">
              <SearchBar />
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <Link to="/favorites" className="flex items-center gap-1 hover:text-orange-500">
              <Heart size={18} /> Favoris
            </Link>

            <Link to={user ? "/account" : "/login"} className="flex items-center gap-1 hover:text-orange-500">
              <User size={18} /> {user ? "Mon compte" : "Connexion"}
            </Link>

            {user && (user.role === "admin" || user.is_admin) && (
              <Link to="/admin-dashboard" className="flex items-center gap-1 text-orange-500">
                <Settings size={18} /> Admin
              </Link>
            )}

            <Link to="/cart" className="flex items-center gap-1 hover:text-orange-500">
              <ShoppingCart size={18} /> Panier
            </Link>
          </div>
        </div>
      </header>

      {/* ================= MOBILE HEADER ================= */}
      <header
        className={`lg:hidden bg-black text-white border-b border-gray-800 fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          isMobileHeaderVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
          {/* LEFT */}
          <div className="flex items-center gap-3">
            <button
              className="p-2 hover:bg-gray-800 rounded-lg"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={24} className="text-[#F97316]" />
            </button>

            {/* ✅ LOGO ONLY — BIGGER */}
            <Link to="/" className="flex items-center">
              <img
                src="/ramm.png"
                alt="RAM Auto Parts"
                className="h-12 sm:h-14 object-contain drop-shadow-md transform scale-[2.7] translate-x-[-20px] translate-y-[6px] origin-left pointer-events-none"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/ram.png";
                }}
              />
            </Link>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-3">
            <Link to="/favorites" className="p-2 hover:bg-gray-800 rounded-lg">
              <Heart size={22} />
            </Link>

            <Link to={user ? "/account" : "/login"} className="p-2 hover:bg-gray-800 rounded-lg">
              <User size={22} />
            </Link>

            <Link to="/cart" className="p-2 hover:bg-gray-800 rounded-lg">
              <ShoppingCart size={22} />
            </Link>
          </div>
        </div>

        <div className="px-3 sm:px-4 pb-3">
          <div className="bg-white rounded-lg">
            <SearchBar />
          </div>
        </div>
      </header>

      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="lg:hidden h-28" />
    </>
  );
};

export default Header;