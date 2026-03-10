import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Upload, RotateCcw, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProducts, updateProduct, createProduct, getSectionContent, updateSectionContent } from "@/api/database";

const CategoryPage = () => {
  const navigate = useNavigate();
  const { categoryName } = useParams<{ categoryName: string }>();
  const decodedCategoryName = categoryName ? decodeURIComponent(categoryName) : '';
  
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionTitle, setSectionTitle] = useState(decodedCategoryName || "Catégorie");
  const [sectionDescription, setSectionDescription] = useState(`Découvrez notre large gamme de ${decodedCategoryName.toLowerCase()} de qualité supérieure pour tous types de véhicules.`);

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

        // Load products from database (filter by category name)
        const productsData = await getProducts();
        const categoryProducts = productsData.filter((p: any) => 
          p.category === decodedCategoryName || 
          p.name?.toLowerCase().includes(decodedCategoryName.toLowerCase())
        );
        
        if (categoryProducts.length > 0) {
          setProducts(categoryProducts);
        }

        // Load section content from database
        const sectionKey = `category_${decodedCategoryName.replace(/\s+/g, '_').toLowerCase()}`;
        const sectionContent = await getSectionContent(sectionKey);
        if (sectionContent) {
          if (sectionContent.title) setSectionTitle(sectionContent.title);
          if (sectionContent.description) setSectionDescription(sectionContent.description);
        } else {
          // Initialize with default values
          setSectionTitle(decodedCategoryName || "Catégorie");
          setSectionDescription(`Découvrez notre large gamme de ${decodedCategoryName.toLowerCase()} de qualité supérieure pour tous types de véhicules.`);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [decodedCategoryName]);

  const handleImageUpload = async (productId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageData = e.target?.result as string;
          await updateProduct(productId, { image: imageData });
          
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
        await updateProduct(productId, {
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice
        });
        
        const updatedProducts = await getProducts();
        const categoryProducts = updatedProducts.filter((p: any) => 
          p.category === decodedCategoryName || 
          p.name?.toLowerCase().includes(decodedCategoryName.toLowerCase())
        );
        setProducts(categoryProducts);
      }
    } catch (error) {
      console.error('Error resetting product texts:', error);
    }
  };

  const handleTitleChange = async (value: string) => {
    try {
      setSectionTitle(value);
      const sectionKey = `category_${decodedCategoryName.replace(/\s+/g, '_').toLowerCase()}`;
      await updateSectionContent(sectionKey, {
        sectionType: sectionKey,
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
      const sectionKey = `category_${decodedCategoryName.replace(/\s+/g, '_').toLowerCase()}`;
      await updateSectionContent(sectionKey, {
        sectionType: sectionKey,
        title: sectionTitle,
        description: value
      });
    } catch (error) {
      console.error('Error updating description:', error);
    }
  };

  const resetTitle = async () => {
    try {
      const defaultTitle = decodedCategoryName || "Catégorie";
      setSectionTitle(defaultTitle);
      const sectionKey = `category_${decodedCategoryName.replace(/\s+/g, '_').toLowerCase()}`;
      await updateSectionContent(sectionKey, {
        sectionType: sectionKey,
        title: defaultTitle,
        description: sectionDescription
      });
    } catch (error) {
      console.error('Error resetting title:', error);
    }
  };

  const resetDescription = async () => {
    try {
      const defaultDescription = `Découvrez notre large gamme de ${decodedCategoryName.toLowerCase()} de qualité supérieure pour tous types de véhicules.`;
      setSectionDescription(defaultDescription);
      const sectionKey = `category_${decodedCategoryName.replace(/\s+/g, '_').toLowerCase()}`;
      await updateSectionContent(sectionKey, {
        sectionType: sectionKey,
        title: sectionTitle,
        description: defaultDescription
      });
    } catch (error) {
      console.error('Error resetting description:', error);
    }
  };

  const handleAddProduct = async () => {
    try {
      const newProduct = {
        name: `Nouveau produit ${decodedCategoryName}`,
        price: "0.00 TND",
        brand: "OEM",
        sku: `CAT${Date.now()}`,
        category: decodedCategoryName,
        loyaltyPoints: 0
      };
      
      const createdProduct = await createProduct(newProduct);
      setProducts(prev => [...prev, createdProduct]);
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      // Note: You may need to add a deleteProduct function to your API
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header />
      
      {/* Main Content */}
      <main className="pt-20 sm:pt-24 md:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
          {/* Hero Section */}
          <section className="text-center mb-8 sm:mb-12">
            {user && user.role === 'admin' ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Input
                    value={sectionTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center text-gray-900 bg-transparent border-orange-500 max-w-2xl"
                    placeholder="Titre de la section"
                  />
                  <Button
                    onClick={resetTitle}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Textarea
                    value={sectionDescription}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto bg-transparent border-orange-500 min-h-[60px]"
                    placeholder="Description de la section"
                  />
                  <Button
                    onClick={resetDescription}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  {sectionTitle}
                </h1>
                <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
                  {sectionDescription}
                </p>
              </>
            )}
          </section>

          {/* Products Grid */}
          <section className="mb-8 sm:mb-12">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-base sm:text-lg text-gray-600">Chargement des produits...</div>
              </div>
            ) : (
              <>
                {user && user.role === 'admin' && (
                  <div className="mb-6 flex justify-end">
                    <Button
                      onClick={handleAddProduct}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un produit
                    </Button>
                  </div>
                )}
                
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 mb-4">Aucun produit trouvé dans cette catégorie.</p>
                    {user && user.role === 'admin' && (
                      <Button
                        onClick={handleAddProduct}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter le premier produit
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                    {products.map((product) => (
                      <div key={product.id} className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
                        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                          <div 
                            className="w-full h-full flex items-center justify-center cursor-pointer transition-transform duration-300 group-hover:scale-105"
                            // onClick={() => navigate('/catalogue')} // Removed: catalogue page deleted
                          >
                            {product.image ? (
                              <img 
                                src={product.image} 
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="text-gray-400 text-center">
                                <div className="text-4xl mb-2">🔧</div>
                                <div className="text-sm font-semibold">{product.brand || 'OEM'}</div>
                              </div>
                            )}
                          </div>
                          
                          {/* Admin Image Controls */}
                          {user && user.role === 'admin' && (
                            <div className="absolute top-2 right-2 z-20 flex gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(product.id, e)}
                                className="hidden"
                                id={`image-upload-${product.id}`}
                              />
                              <label
                                htmlFor={`image-upload-${product.id}`}
                                className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 p-2 rounded-lg cursor-pointer shadow-lg transition-all"
                                title="Changer l'image"
                              >
                                <Upload className="h-4 w-4" />
                              </label>
                              {product.image && (
                                <button
                                  onClick={() => handleRemoveImage(product.id)}
                                  className="bg-white/90 backdrop-blur-sm hover:bg-white text-red-600 p-2 rounded-lg shadow-lg transition-all"
                                  title="Supprimer l'image"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="bg-white/90 backdrop-blur-sm hover:bg-white text-red-600 p-2 rounded-lg shadow-lg transition-all"
                                title="Supprimer le produit"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}

                          {/* Discount Badge */}
                          {product.discount && (
                            <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 py-1 rounded-lg text-xs font-semibold shadow-lg">
                              {product.discount}
                            </div>
                          )}
                        </div>
                        
                        {/* Card Content */}
                        <div className="p-4 sm:p-5 md:p-6">
                          {user && user.role === 'admin' ? (
                            <div className="space-y-3">
                              <div className="relative">
                                <Input
                                  value={product.name}
                                  onChange={(e) => handleTextChange(product.id, 'name', e.target.value)}
                                  className="text-sm font-medium bg-transparent border-orange-500"
                                  placeholder="Nom du produit"
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="relative">
                                  <Input
                                    value={product.price}
                                    onChange={(e) => handleTextChange(product.id, 'price', e.target.value)}
                                    className="text-base sm:text-lg font-bold text-orange-500 bg-transparent border-orange-500"
                                    placeholder="Prix"
                                  />
                                </div>

                                {product.originalPrice && (
                                  <div className="relative">
                                    <Input
                                      value={product.originalPrice}
                                      onChange={(e) => handleTextChange(product.id, 'originalPrice', e.target.value)}
                                      className="text-sm text-gray-500 bg-transparent border-gray-300"
                                      placeholder="Prix original"
                                    />
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
                              <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                              
                              {/* Specs Line */}
                              <div className="flex items-center justify-between mb-3 text-xs sm:text-sm text-gray-600">
                                <span>{product.brand || 'OEM'}</span>
                                <span className="text-xs">{product.sku}</span>
                              </div>
                              
                              {/* Price Row */}
                              <div className="flex items-center justify-between mb-4">
                                {product.originalPrice ? (
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-lg sm:text-xl font-bold text-orange-500">{product.price}</span>
                                    <span className="text-sm text-gray-500 line-through">{product.originalPrice}</span>
                                  </div>
                                ) : (
                                  <span className="text-lg sm:text-xl font-bold text-orange-500">{product.price}</span>
                                )}
                              </div>
                              
                              {/* CTA Row */}
                              {/* Removed: Button navigation to /catalogue - catalogue page deleted */}
                              {/* <button
                                onClick={() => navigate('/catalogue')}
                                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-xl px-4 py-2.5 sm:py-3 transition-all duration-300 hover:shadow-lg"
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
              </>
            )}
          </section>

          {/* Features Section */}
          <section className="bg-white rounded-xl shadow-md p-6 sm:p-8 mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center text-gray-900 mb-6 sm:mb-8">
              Pourquoi choisir nos {decodedCategoryName.toLowerCase()} ?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-4">✅</div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Qualité Certifiée</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Tous nos produits sont certifiés et testés pour garantir une qualité optimale.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-4">🔧</div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Installation Facile</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Conception adaptée pour une installation simple et rapide sur tous véhicules.
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-4">💪</div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Longue Durée</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Matériaux de haute qualité pour une durée de vie prolongée et des performances constantes.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-4">
              Besoin d'aide pour choisir vos {decodedCategoryName.toLowerCase()} ?
            </h2>
            <p className="text-sm sm:text-base text-orange-100 mb-6 max-w-2xl mx-auto">
              Notre équipe d'experts est disponible pour vous conseiller sur les produits adaptés à votre véhicule.
            </p>
            <button className="bg-white text-orange-500 hover:bg-gray-100 font-semibold rounded-xl px-6 py-3 transition-all duration-300">
              Contactez-nous
            </button>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryPage;

