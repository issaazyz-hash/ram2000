import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Upload, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, updateProduct, createProduct, getSectionContent, updateSectionContent } from "@/api/database";

const FiltresPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionTitle, setSectionTitle] = useState("Filtres Auto");
  const [sectionDescription, setSectionDescription] = useState("Découvrez notre large gamme de filtres automobiles de qualité supérieure pour tous types de véhicules. Filtres à huile, à air, à carburant et habitacle.");

  const defaultProducts = [
    { id: 1, name: "Filtre à huile premium", price: "24.90 TND", originalPrice: "29.90 TND", discount: "-17%", type: "oil-filter" },
    { id: 2, name: "Filtre à air haute performance", price: "34.90 TND", originalPrice: "", discount: "", type: "air-filter" },
    { id: 3, name: "Filtre à carburant diesel", price: "44.90 TND", originalPrice: "49.90 TND", discount: "-10%", type: "fuel-filter" },
    { id: 4, name: "Filtre habitacle anti-pollen", price: "39.90 TND", originalPrice: "", discount: "", type: "habitacle-filter" },
    { id: 5, name: "Kit de filtration complet", price: "129.90 TND", originalPrice: "159.90 TND", discount: "-19%", type: "filter-kit" },
    { id: 6, name: "Support filtre à huile", price: "14.90 TND", originalPrice: "", discount: "", type: "oil-filter-support" },
    { id: 7, name: "Filtre à air sport haute performance", price: "89.90 TND", originalPrice: "99.90 TND", discount: "-10%", type: "sport-air-filter" },
    { id: 8, name: "Filtre à huile longue durée", price: "29.90 TND", originalPrice: "", discount: "", type: "oil-filter" },
    { id: 9, name: "Filtre à air universel", price: "27.90 TND", originalPrice: "32.90 TND", discount: "-15%", type: "air-filter" },
    { id: 10, name: "Filtre à carburant essence", price: "39.90 TND", originalPrice: "", discount: "", type: "fuel-filter" },
    { id: 11, name: "Filtre habitacle charbon actif", price: "49.90 TND", originalPrice: "54.90 TND", discount: "-9%", type: "habitacle-filter" },
    { id: 12, name: "Kit filtres révision complète", price: "149.90 TND", originalPrice: "179.90 TND", discount: "-17%", type: "filter-kit" }
  ];

  // Load user and data from database
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load user from localStorage
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        // Load products from database (filter by category)
        const productsData = await getProducts();
        const filterProducts = productsData.filter((p: any) => p.category === "Filtres");
        
        if (filterProducts.length > 0) {
          setProducts(filterProducts);
        } else {
          // Initialize with default products if database is empty
          const defaultProductsData = defaultProducts.map((product, index) => ({
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            discount: product.discount,
            brand: "OEM",
            sku: `FLT${String(index + 1).padStart(5, '0')}`,
            category: "Filtres",
            loyaltyPoints: 3.5,
            filterType: product.type,
          }));
          
          // Create products in database
          for (const productData of defaultProductsData) {
            await createProduct(productData);
          }
          
          // Reload products
          const newProducts = await getProducts();
          const newFilterProducts = newProducts.filter((p: any) => p.category === "Filtres");
          setProducts(newFilterProducts);
        }

        // Load section content from database
        const sectionContent = await getSectionContent('filtres');
        if (sectionContent) {
          if (sectionContent.title) setSectionTitle(sectionContent.title);
          if (sectionContent.description) setSectionDescription(sectionContent.description);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleImageUpload = async (productId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageData = e.target?.result as string;
          await updateProduct(productId, { image: imageData });
          
          // Update local state
          setProducts(prev => prev.map(product => 
            product.id === productId 
              ? { ...product, image: imageData }
              : product
          ));
        } catch (error) {
          console.error('Error updating product image:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async (productId: string) => {
    try {
      await updateProduct(productId, { image: null });
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, image: null }
          : product
      ));
    } catch (error) {
      console.error('Error removing product image:', error);
    }
  };

  const handleTextChange = async (productId: string, field: string, value: string) => {
    try {
      const updateData: any = {};
      if (field === 'name') updateData.name = value;
      if (field === 'price') updateData.price = value;
      if (field === 'originalPrice') updateData.originalPrice = value;
      
      await updateProduct(productId, updateData);
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, ...updateData }
          : product
      ));
    } catch (error) {
      console.error('Error updating product text:', error);
    }
  };

  const resetTexts = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (product) {
        // Reset to original values
        await updateProduct(productId, {
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice
        });
        
        // Reload products to get updated data
        const updatedProducts = await getProducts();
        const filterProducts = updatedProducts.filter((p: any) => p.category === "Filtres");
        setProducts(filterProducts);
      }
    } catch (error) {
      console.error('Error resetting product texts:', error);
    }
  };

  const handleTitleChange = async (value: string) => {
    try {
      setSectionTitle(value);
      await updateSectionContent('filtres', {
        sectionType: 'filtres',
        title: value,
        description: sectionDescription
      });
    } catch (error) {
      console.error('Error updating title:', error);
    }
  };

  const handleDescriptionChange = async (value: string) => {
    try {
      setSectionDescription(value);
      await updateSectionContent('filtres', {
        sectionType: 'filtres',
        title: sectionTitle,
        description: value
      });
    } catch (error) {
      console.error('Error updating description:', error);
    }
  };

  const resetTitle = async () => {
    try {
      const defaultTitle = "Filtres Auto";
      setSectionTitle(defaultTitle);
      await updateSectionContent('filtres', {
        sectionType: 'filtres',
        title: defaultTitle,
        description: sectionDescription
      });
    } catch (error) {
      console.error('Error resetting title:', error);
    }
  };

  const resetDescription = async () => {
    try {
      const defaultDescription = "Découvrez notre large gamme de filtres automobiles de qualité supérieure pour tous types de véhicules. Filtres à huile, à air, à carburant et habitacle.";
      setSectionDescription(defaultDescription);
      await updateSectionContent('filtres', {
        sectionType: 'filtres',
        title: sectionTitle,
        description: defaultDescription
      });
    } catch (error) {
      console.error('Error resetting description:', error);
    }
  };

  const handleDiscountChange = async (productId: string, value: string) => {
    try {
      await updateProduct(productId, { discount: value });
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, discount: value }
          : product
      ));
    } catch (error) {
      console.error('Error updating product discount:', error);
    }
  };

  const removeDiscount = async (productId: string) => {
    try {
      await updateProduct(productId, { discount: null });
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, discount: null }
          : product
      ));
    } catch (error) {
      console.error('Error removing product discount:', error);
    }
  };

  const getFilterIcon = (filterType: string) => {
    const iconMap: { [key: string]: string } = {
      'oil-filter': '🛢️',
      'air-filter': '💨',
      'fuel-filter': '⛽',
      'habitacle-filter': '🌬️',
      'filter-kit': '🔧',
      'oil-filter-support': '🔩',
      'sport-air-filter': '🏁',
    };
    return iconMap[filterType] || '🔧';
  };

  return (
    <div className="mobile-min-vh bg-gray-50 no-scroll-x">
      <Header />
      
      {/* Main Content */}
      <main className="pt-32 sm:pt-36 md:pt-40">
        <div className="container-responsive py-responsive">
          {/* Hero Section */}
          <section className="text-center mb-8 sm:mb-12">
            {user && user.role === 'admin' ? (
              <div className="space-y-4">
                <div className="mobile-stack items-center justify-center">
                  <Input
                    value={sectionTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="text-responsive-xl font-bold text-center text-gray-900 bg-transparent border-orange-500 mobile-input"
                    placeholder="Titre de la section"
                  />
                  <Button
                    onClick={resetTitle}
                    variant="outline"
                    size="sm"
                    className="mobile-button text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
                <div className="mobile-stack items-center justify-center">
                  <Textarea
                    value={sectionDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    className="text-responsive-lg text-gray-600 max-w-3xl mx-auto bg-transparent border-orange-500 min-h-[60px] mobile-input"
                    placeholder="Description de la section"
                  />
                  <Button
                    onClick={resetDescription}
                    variant="outline"
                    size="sm"
                    className="mobile-button text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-responsive-xl font-bold text-gray-900 mb-4">
                  {sectionTitle}
                </h1>
                <p className="text-responsive-lg text-gray-600 max-w-3xl mx-auto">
                  {sectionDescription}
                </p>
              </>
            )}
          </section>

          {/* Products Grid */}
          <section className="mb-8 sm:mb-12">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-responsive-lg text-gray-600">Chargement des produits...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10 lg:gap-14 xl:gap-16">
                {products.map((product) => (
                <div key={product.id} className="group luxury-card overflow-hidden luxury-transition-fast md:h-full">
                  <div className="relative aspect-[4/3] md:aspect-[4/3] overflow-hidden bg-[var(--color-surface-muted)]">
                    <div 
                      className="w-full h-full flex items-center justify-center cursor-pointer luxury-transition-fast group-hover:scale-105"
                      // onClick={() => navigate('/catalogue')} // Removed: catalogue page deleted
                    >
                      {product.image ? (
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover luxury-transition-fast"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-gray-700 text-center">
                          <div className="text-4xl mb-2">{getFilterIcon(product.filterType)}</div>
                          <div className="text-sm font-semibold">{product.brand}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Quick Actions - Reveal on Hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 luxury-transition-fast flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 z-10">
                      <button className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-semibold text-gray-900 luxury-transition-fast hover:bg-white transform translate-y-2 group-hover:translate-y-0">
                        Voir détails
                      </button>
                    </div>
                    
                    {/* Admin Image Controls */}
                    {user && user.role === 'admin' && (
                      <div className="absolute top-3 right-3 z-20 flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(product.id, e)}
                          className="hidden"
                          id={`image-upload-${product.id}`}
                        />
                        <label
                          htmlFor={`image-upload-${product.id}`}
                          className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 p-2 rounded-lg cursor-pointer shadow-lg luxury-transition-fast"
                          title="Changer l'image"
                        >
                          <Upload className="h-4 w-4" />
                        </label>
                        {product.image && (
                          <button
                            onClick={() => handleRemoveImage(product.id)}
                            className="bg-white/90 backdrop-blur-sm hover:bg-white text-red-600 p-2 rounded-lg shadow-lg luxury-transition-fast"
                            title="Supprimer l'image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Discount Badge */}
                    {product.discount && (
                      <div className="absolute top-3 left-3 z-20 bg-[var(--gradient-primary)] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg">
                        {product.discount}
                      </div>
                    )}
                  </div>
                  
                  {/* Card Content */}
                  <div className="p-6">
                    {user && user.role === 'admin' ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <Input
                            value={product.name}
                            onChange={(e) => handleTextChange(product.id, 'name', e.target.value)}
                            className="text-sm font-medium bg-transparent border-orange-500"
                            placeholder="Nom du produit"
                          />
                          {product.name && (
                            <button
                              type="button"
                              onClick={() => handleTextChange(product.id, 'name', '')}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 text-sm"
                              title="Effacer le nom"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="relative">
                            <Input
                              value={product.price}
                              onChange={(e) => handleTextChange(product.id, 'price', e.target.value)}
                              className="text-lg font-bold text-orange-500 bg-transparent border-orange-500"
                              placeholder="Prix"
                            />
                            {product.price && (
                              <button
                                type="button"
                                onClick={() => handleTextChange(product.id, 'price', '')}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 text-sm"
                                title="Effacer le prix"
                              >
                                ×
                              </button>
                            )}
                          </div>

                          {product.originalPrice && (
                            <div className="relative">
                              <Input
                                value={product.originalPrice}
                                onChange={(e) => handleTextChange(product.id, 'originalPrice', e.target.value)}
                                className="text-sm text-gray-500 bg-transparent border-gray-300"
                                placeholder="Prix original"
                              />
                              {product.originalPrice && (
                                <button
                                  type="button"
                                  onClick={() => handleTextChange(product.id, 'originalPrice', '')}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 text-sm"
                                  title="Effacer le prix original"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => resetTexts(product.id)}
                          variant="outline"
                          size="sm"
                          className="text-xs w-full"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Product Name */}
                        <h3 className="luxury-subhead text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                        
                        {/* Specs Line */}
                        <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                          <span>{product.brand}</span>
                          <span className="text-xs">{product.sku}</span>
                        </div>
                        
                        {/* Price Row */}
                        <div className="flex items-center justify-between mb-4">
                          {product.originalPrice ? (
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-bold text-[var(--color-primary-orange)]">{product.price}</span>
                              <span className="text-sm text-gray-500 line-through">{product.originalPrice}</span>
                            </div>
                          ) : (
                            <span className="text-xl font-bold text-[var(--color-primary-orange)]">{product.price}</span>
                          )}
                        </div>
                        
                        {/* CTA Row */}
                        {/* Removed: Button navigation to /catalogue - catalogue page deleted */}
                        {/* <button
                          onClick={() => navigate('/catalogue')}
                          className="w-full luxury-gradient-primary text-white font-semibold rounded-2xl px-6 py-3 luxury-transition-fast hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow-strong)] active:translate-y-0"
                        >
                          Voir détails
                        </button> */}
                      </>
                    )}
                  </div>
                </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-center items-center mt-8 space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50" disabled>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button className="w-8 h-8 bg-orange-500 text-white rounded-full text-sm font-medium">1</button>
              <button className="w-8 h-8 text-gray-600 hover:bg-gray-100 rounded-full text-sm font-medium">2</button>
              <button className="w-8 h-8 text-gray-600 hover:bg-gray-100 rounded-full text-sm font-medium">3</button>
              <button className="p-2 text-gray-600 hover:text-gray-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </section>

          {/* Features Section */}
          <section className="bg-white rounded-lg shadow-md mobile-card mb-8 sm:mb-12">
            <h2 className="text-responsive-lg font-bold text-center text-gray-900 mb-6 sm:mb-8">
              Pourquoi choisir nos filtres ?
            </h2>
            <div className="mobile-grid md:grid-cols-3 gap-responsive">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-4">✅</div>
                <h3 className="text-responsive-lg font-semibold text-gray-900 mb-2">Qualité Certifiée</h3>
                <p className="text-responsive-sm text-gray-600">
                  Tous nos filtres sont certifiés et testés pour garantir une filtration optimale.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-4">🔧</div>
                <h3 className="text-responsive-lg font-semibold text-gray-900 mb-2">Installation Facile</h3>
                <p className="text-responsive-sm text-gray-600">
                  Conception adaptée pour une installation simple et rapide sur tous véhicules.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-4">💪</div>
                <h3 className="text-responsive-lg font-semibold text-gray-900 mb-2">Longue Durée</h3>
                <p className="text-responsive-sm text-gray-600">
                  Matériaux de haute qualité pour une durée de vie prolongée et des performances constantes.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-orange-500 rounded-lg mobile-card">
            <h2 className="text-responsive-lg font-bold text-white mb-4">
              Besoin d'aide pour choisir vos filtres ?
            </h2>
            <p className="text-responsive-sm text-orange-100 mb-6 max-w-2xl mx-auto">
              Notre équipe d'experts est disponible pour vous conseiller sur les filtres adaptés à votre véhicule.
            </p>
            <button className="bg-white text-orange-500 hover:bg-gray-100 mobile-button mobile-tap">
              Contactez-nous
            </button>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FiltresPage;

