import { useEffect, useState } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import EauEtAdditifSection from "@/components/EauEtAdditifSection";
import BrandsSection from "@/components/BrandsSection";
import PromotionsSection from "@/components/PromotionsSection";
import FamilleSection from "@/components/home/FamilleSection";
import Footer from "@/components/Footer";

const Index = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Clear all breadcrumb data when visiting homepage
    localStorage.removeItem("selectedBrand");
    localStorage.removeItem("selectedModel");
    localStorage.removeItem("selected_marque");
    localStorage.removeItem("selected_modele");
    localStorage.removeItem("breadcrumb_catalogue");
    localStorage.removeItem("breadcrumb_catalogue2");
    localStorage.removeItem("breadcrumb_pieces");
    localStorage.removeItem("breadcrumb_product");
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
      <Header />
      
      {/* Welcome Message */}
      {user && (
        <div className="bg-orange-500 text-white py-2 px-3 sm:py-3 sm:px-4 md:py-4 md:px-6 text-center w-full">
          <p className="text-xs sm:text-sm md:text-base lg:text-lg font-medium truncate">
            Welcome back, {user.username}! You are logged in as {user.role}.
          </p>
        </div>
      )}
      
      <main className="w-full max-w-full overflow-x-hidden">
        <PromotionsSection />
        <FamilleSection />
        <BrandsSection />
        <HeroSection />
        <EauEtAdditifSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
