import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2, Package, AlertTriangle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { getProducts, updateProduct, createProduct, deleteProduct } from "@/api/database";

const StockManagement = () => {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // New product form
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    originalPrice: "",
    discount: "",
    brand: "",
    sku: "",
    category: "",
    loyaltyPoints: 0,
    stock: 0,
    minStock: 5
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load user
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        // Load products
        const productsData = await getProducts();
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter products based on search and status
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || 
                         (filterStatus === "low" && product.stock <= product.minStock) ||
                         (filterStatus === "out" && product.stock === 0) ||
                         (filterStatus === "in" && product.stock > product.minStock);
    
    return matchesSearch && matchesStatus;
  });

  const handleAddProduct = async () => {
    try {
      const productData = {
        ...newProduct,
        hasPreview: false,
        hasOptions: false
      };
      
      await createProduct(productData);
      
      // Reload products
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);
      
      // Reset form
      setNewProduct({
        name: "",
        price: "",
        originalPrice: "",
        discount: "",
        brand: "",
        sku: "",
        category: "",
        loyaltyPoints: 0,
        stock: 0,
        minStock: 5
      });
      setShowAddForm(false);
      
      alert('Produit ajouté avec succès!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Erreur lors de l\'ajout du produit');
    }
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    try {
      await updateProduct(productId, { stock: newStock });
      
      // Update local state
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, stock: newStock }
          : product
      ));
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Erreur lors de la mise à jour du stock');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit?')) {
      try {
        await deleteProduct(productId);
        
        // Update local state
        setProducts(prev => prev.filter(product => product.id !== productId));
        alert('Produit supprimé avec succès!');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Erreur lors de la suppression du produit');
      }
    }
  };

  const getStockStatus = (product: any) => {
    if (product.stock === 0) return { status: 'out', color: 'bg-red-500', text: 'Rupture de stock' };
    if (product.stock <= product.minStock) return { status: 'low', color: 'bg-yellow-500', text: 'Stock faible' };
    return { status: 'in', color: 'bg-green-500', text: 'En stock' };
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accès refusé</h1>
          <p className="text-gray-600">Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 no-scroll-x">
      <Header />
      
      <main className="pt-32 sm:pt-36 md:pt-40">
        <div className="container-responsive py-responsive">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-responsive-xl font-bold text-gray-900 mb-2">Gestion de Stock</h1>
            <p className="text-responsive-sm text-gray-600">Gérez l'inventaire de vos produits</p>
          </div>

          {/* Stats Cards */}
          <div className="mobile-grid lg:grid-cols-4 gap-responsive mb-6 sm:mb-8">
            <Card>
              <CardContent className="mobile-card">
                <div className="flex items-center">
                  <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-responsive-sm font-medium text-gray-600">Total Produits</p>
                    <p className="text-responsive-xl font-bold text-gray-900">{products.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="mobile-card">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-responsive-sm font-medium text-gray-600">En Stock</p>
                    <p className="text-responsive-xl font-bold text-gray-900">
                      {products.filter(p => p.stock > p.minStock).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="mobile-card">
                <div className="flex items-center">
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
                  <div className="ml-4">
                    <p className="text-responsive-sm font-medium text-gray-600">Stock Faible</p>
                    <p className="text-responsive-xl font-bold text-gray-900">
                      {products.filter(p => p.stock > 0 && p.stock <= p.minStock).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="mobile-card">
                <div className="flex items-center">
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-responsive-sm font-medium text-gray-600">Rupture</p>
                    <p className="text-responsive-xl font-bold text-gray-900">
                      {products.filter(p => p.stock === 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="mobile-stack gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-responsive-sm mobile-input mobile-focus"
                />
              </div>
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mobile-input border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-responsive-sm mobile-focus"
            >
              <option value="all">Tous les produits</option>
              <option value="in">En stock</option>
              <option value="low">Stock faible</option>
              <option value="out">Rupture de stock</option>
            </select>

            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-orange-500 hover:bg-orange-600 text-responsive-sm mobile-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter Produit
            </Button>
          </div>

          {/* Add Product Form */}
          {showAddForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-responsive-sm">Ajouter un nouveau produit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    placeholder="Nom du produit"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    className="text-responsive-sm"
                  />
                  <Input
                    placeholder="Prix"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    className="text-responsive-sm"
                  />
                  <Input
                    placeholder="Prix original"
                    value={newProduct.originalPrice}
                    onChange={(e) => setNewProduct({...newProduct, originalPrice: e.target.value})}
                    className="text-responsive-sm"
                  />
                  <Input
                    placeholder="Marque"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                    className="text-responsive-sm"
                  />
                  <Input
                    placeholder="SKU"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                    className="text-responsive-sm"
                  />
                  <Input
                    placeholder="Catégorie"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="text-responsive-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Stock"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})}
                    className="text-responsive-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Stock minimum"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({...newProduct, minStock: parseInt(e.target.value) || 0})}
                    className="text-responsive-sm"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Points de fidélité"
                    value={newProduct.loyaltyPoints}
                    onChange={(e) => setNewProduct({...newProduct, loyaltyPoints: parseFloat(e.target.value) || 0})}
                    className="text-responsive-sm"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <Button onClick={handleAddProduct} className="bg-orange-500 hover:bg-orange-600 text-responsive-sm">
                    Ajouter
                  </Button>
                  <Button onClick={() => setShowAddForm(false)} variant="outline" className="text-responsive-sm">
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-responsive-sm">Liste des Produits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 sm:px-4 text-responsive-sm">Produit</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-responsive-sm">SKU</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-responsive-sm">Prix</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-responsive-sm">Stock</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-responsive-sm">Statut</th>
                      <th className="text-left py-3 px-2 sm:px-4 text-responsive-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product);
                      return (
                        <tr key={product.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2 sm:px-4">
                            <div>
                              <div className="font-medium text-gray-900 text-responsive-sm">{product.name}</div>
                              <div className="text-xs sm:text-sm text-gray-500">{product.brand}</div>
                            </div>
                          </td>
                          <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">{product.sku}</td>
                          <td className="py-3 px-2 sm:px-4">
                            <div className="text-xs sm:text-sm font-medium">{product.price}</div>
                            {product.originalPrice && (
                              <div className="text-xs text-gray-500 line-through">{product.originalPrice}</div>
                            )}
                          </td>
                          <td className="py-3 px-2 sm:px-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                              <Input
                                type="number"
                                value={product.stock || 0}
                                onChange={(e) => handleUpdateStock(product.id, parseInt(e.target.value) || 0)}
                                className="w-16 sm:w-20 text-responsive-sm"
                                min="0"
                              />
                              <span className="text-xs sm:text-sm text-gray-500">/ {product.minStock || 5}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2 sm:px-4">
                            <Badge className={`${stockStatus.color} text-white text-xs`}>
                              {stockStatus.text}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 sm:px-4">
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingProduct(product)}
                                className="text-xs"
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-700 text-xs"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StockManagement;
