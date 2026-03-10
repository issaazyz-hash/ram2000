import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import ProductPromoBlock from "@/components/ProductPromoBlock";
import ProductSpecsSection from "@/components/ProductSpecsSection";
import RelatedProducts from "@/components/RelatedProducts";

const Conditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
      <Header />
      
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16">
        {/* Product Promo Block */}
        <div className="mb-8">
          <ProductPromoBlock
            productName="Produit promotionnel"
            reference="REF-001"
            price="150.00"
            images={["/ff.png", "/ll.png"]}
          />
        </div>

        {/* Product Specs Section */}
        <ProductSpecsSection />

        {/* Related Products Section */}
        <RelatedProducts
          currentProductName="Produit promotionnel"
          currentProductCategory="Filtres"
          limit={4}
        />

        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#F97316] mb-6 sm:mb-8 text-center">
            Conditions de l'offre
          </h1>
          
          <div className="prose prose-sm sm:prose-base max-w-none mb-8 sm:mb-10 text-gray-700">
            <p className="mb-4">
              Les promotions et offres spéciales sont valables dans les limites des stocks disponibles.
            </p>
            <p className="mb-4">
              Les prix indiqués sont en dinars tunisiens (DT) et peuvent être modifiés sans préavis.
            </p>
            <p className="mb-4">
              Les offres sont valables jusqu'à la date d'expiration indiquée ou jusqu'à épuisement des stocks.
            </p>
            <p className="mb-4">
              Les images sont fournies à titre indicatif et peuvent différer du produit réel.
            </p>
            <p>
              Pour toute question concernant nos offres, n'hésitez pas à nous contacter.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => navigate(-1)}
              className="bg-gradient-to-r from-[#F97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#F97316] text-white font-semibold rounded-lg px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              Retour
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Conditions;

