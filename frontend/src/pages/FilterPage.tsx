import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ChevronLeft, Search, ShoppingCart, Menu, Star, Droplets, Car, Wrench, User, Heart, LogOut, X, Home, Edit, Trash2, Save, ChevronRight, Upload, Cog, Circle, Filter, Thermometer, Lightbulb, Gauge, Zap, MapPin, CheckCircle, CreditCard, ShieldCheck, Truck, Share2, MessageCircle, PhoneCall, Store } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '../components/ui/sheet';

// UPDATED: Constants for modern e-commerce layout
const DEFAULT_COLOR_SWATCHES = ['#111827', '#d1d5db', '#f97316', '#2563eb', '#059669'];

const PAYMENT_BENEFITS = [
  {
    title: 'Paiement sécurisé',
    description: 'Carte bancaire / Espèces à la livraison',
    icon: CreditCard,
  },
  {
    title: 'Garantie 12 mois',
    description: 'Retour simple sous 30 jours',
    icon: ShieldCheck,
  },
  {
    title: 'Livraison express',
    description: 'Partout en Tunisie sous 72h',
    icon: Truck,
  },
];

const STOCK_LOCATIONS = [
  {
    store: 'Showroom Tunis',
    availability: 'En stock',
    eta: 'Retrait immédiat',
  },
  {
    store: 'Agence Sousse',
    availability: 'Stock limité',
    eta: 'Disponible sous 24h',
  },
  {
    store: 'Atelier Sfax',
    availability: 'Sur commande',
    eta: 'Livraison 48h',
  },
];

const ACCESSORIES_FALLBACK = [
  { id: 'acc-1', name: 'Kit de montage premium', price: '59.90', image: '/ff.png', availability: 'En stock' },
  { id: 'acc-2', name: 'Support moteur renforcé', price: '89.50', image: '/ll.png', availability: 'En stock' },
  { id: 'acc-3', name: 'Pack visserie inox', price: '24.90', image: '/ff.png', availability: 'Disponible' },
  { id: 'acc-4', name: 'Fioul Stop Pro', price: '39.00', image: '/ll.png', availability: 'Nouveau' },
];

const SIMILAR_FALLBACK = [
  { id: 'sim-1', name: 'Filtre à huile sport', price: '45.00', image: '/ff.png' },
  { id: 'sim-2', name: 'Filtre à air performance', price: '72.00', image: '/ll.png' },
  { id: 'sim-3', name: 'Cartouche OEM', price: '54.80', image: '/ff.png' },
  { id: 'sim-4', name: 'Filtre habitacle carbone', price: '63.20', image: '/ll.png' },
];

const OTHER_PRODUCTS_FALLBACK = [
  { id: 'oth-1', name: 'Batterie AGM 70Ah', price: '349.00', image: '/ff.png' },
  { id: 'oth-2', name: 'Plaquettes Brembo', price: '189.00', image: '/ll.png' },
  { id: 'oth-3', name: 'Disque ventilé 320mm', price: '229.50', image: '/ff.png' },
  { id: 'oth-4', name: 'Amortisseur sport', price: '410.00', image: '/ll.png' },
  { id: 'oth-5', name: 'Pompe à eau OEM', price: '265.00', image: '/ff.png' },
  { id: 'oth-6', name: 'Courroie de distribution', price: '138.00', image: '/ll.png' },
  { id: 'oth-7', name: 'Capteur ABS', price: '119.00', image: '/ff.png' },
  { id: 'oth-8', name: 'Turbo Garrett', price: '1290.00', image: '/ll.png' },
];

const FilterPage: React.FC = () => {
  const { filterId } = useParams<{ filterId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'plate' | 'vehicle'>('plate');

  // جلب بيانات الفلتر من localStorage
  const [filterData, setFilterData] = useState<any>(null);
  
  // State for all filters (for Best Sellers section)
  const [allFilters, setAllFilters] = useState<any[]>([]);

  // State for user authentication
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // State for model and motorisation selection
  const [selectedModele, setSelectedModele] = useState<string>('');
  const [selectedMotorisation, setSelectedMotorisation] = useState<string>('');
  
  // UPDATED: State for quantity
  const [quantity, setQuantity] = useState<number>(1);
  
  // State for admin editing features
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    image: '',
    price: '',
    ref: '',
    ref1: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingRefs, setIsEditingRefs] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [referenceFields, setReferenceFields] = useState<Array<{id: string, label: string, value: string}>>([]);
  
  // State for managing Modèles and Motorisations (Admin only)
  const [modeles, setModeles] = useState<string[]>(['Modèle 1', 'Modèle 2', 'Modèle 3', 'Modèle 4', 'Modèle 5']);
  const [motorisations, setMotorisations] = useState<string[]>(['Essence', 'Diesel', 'Hybride', 'Électrique', 'GPL']);
  const [showAddModele, setShowAddModele] = useState(false);
  const [showAddMotorisation, setShowAddMotorisation] = useState(false);
  const [newModele, setNewModele] = useState('');
  const [newMotorisation, setNewMotorisation] = useState('');
  const [editingModeleIndex, setEditingModeleIndex] = useState<number | null>(null);
  const [editingMotorisationIndex, setEditingMotorisationIndex] = useState<number | null>(null);
  const [editModeleValue, setEditModeleValue] = useState('');
  const [editMotorisationValue, setEditMotorisationValue] = useState('');
  
  // State for image carousel (3 images)
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productImages, setProductImages] = useState<string[]>([]);
  
  // State for managing product images (admin only)
  const [showImageManager, setShowImageManager] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string>('');
  
  // State for Commander order form
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showCommanderQuantity, setShowCommanderQuantity] = useState(false);
  const [commanderQuantity, setCommanderQuantity] = useState(1);
  const [orderData, setOrderData] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    governorate: ''
  });
  
  // UPDATED: State for description tabs
  const [activeInfoTab, setActiveInfoTab] = useState<'description' | 'specs' | 'care'>('description');
  
  // Check if user is admin
  const isAdmin = user && (user.role === 'admin' || user.is_admin === true);
  
  // UPDATED: Helper data for e-commerce layout
  const colorOptions = filterData?.colors?.length ? filterData.colors : DEFAULT_COLOR_SWATCHES;
  const accessoriesProducts = (allFilters.length ? allFilters.slice(0, 4) : ACCESSORIES_FALLBACK);
  const similarProducts = (allFilters.length ? allFilters.slice(0, 4) : SIMILAR_FALLBACK);
  const otherProducts = (allFilters.length ? allFilters.slice(0, 8) : OTHER_PRODUCTS_FALLBACK);
  
  const infoTabs = [
    { key: 'description', label: 'Description' },
    { key: 'specs', label: 'Caractéristiques' },
    { key: 'care', label: 'Entretien' },
  ] as const;
  
  const tabContentMap: Record<typeof infoTabs[number]['key'], string> = {
    description: filterData?.description || 'Pièce d\'origine certifiée, testée et garantie pour assurer les meilleures performances et une longévité optimale de votre moteur.',
    specs: 'Structure en aluminium haute densité, compatibilité OEM, filtration multicouche 5 microns, résistance thermique jusqu\'à 180° C.',
    care: 'Changer toutes les 10 000 km, vérifier l\'étanchéité à chaque vidange et stocker à l\'abri de l\'humidité.',
  };
  
  // UPDATED: Helper function for section headings with blue bar
  const renderSectionHeading = (eyebrow: string, title: string) => (
    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
      <span className="inline-flex h-6 sm:h-8 lg:h-10 w-0.5 sm:w-1 lg:w-1.5 rounded-full bg-blue-600 flex-shrink-0" aria-hidden />
      <div>
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.35em] text-blue-500">{eyebrow}</p>
        <h3 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900">{title}</h3>
      </div>
    </div>
  );

  // UPDATED: Helper function for accurate price calculation
  const calculateTotalPrice = (unitPrice: string | number, qty: number): string => {
    const price = typeof unitPrice === 'string' ? parseFloat(unitPrice) || 0 : unitPrice || 0;
    // Use Math.round to avoid floating point precision issues
    const total = Math.round((price * qty) * 100) / 100;
    return total.toFixed(2);
  };

  // Load user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Load Modèles and Motorisations from localStorage
  useEffect(() => {
    const savedModeles = localStorage.getItem('filterModeles');
    const savedMotorisations = localStorage.getItem('filterMotorisations');
    
    if (savedModeles) {
      setModeles(JSON.parse(savedModeles));
    }
    if (savedMotorisations) {
      setMotorisations(JSON.parse(savedMotorisations));
    }
  }, []);

  // Load all filters for Best Sellers section
  useEffect(() => {
    const customFilters = JSON.parse(localStorage.getItem('customFilters') || '[]');
    const customLinks = JSON.parse(localStorage.getItem('customLinks') || '[]');
    
    let allFiltersList: any[] = [];
    
    // Add main filters
    customFilters.forEach((filter: any) => {
      if (filter.url && filter.id !== filterId) {
        allFiltersList.push(filter);
      }
      
      // Add sub-links
      if (filter.links && Array.isArray(filter.links)) {
        filter.links.forEach((link: any) => {
          if (link.url && link.id !== filterId) {
            allFiltersList.push(link);
          }
        });
      }
    });
    
    // Add custom links (excluding current filter)
    customLinks.forEach((link: any) => {
      if (link.url && link.id !== filterId) {
        allFiltersList.push(link);
      }
    });
    
    setAllFilters(allFiltersList);
  }, [filterId]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('userLogout'));
    window.location.href = '/login';
  };

  // Handle image selection for editing
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setEditData(prev => ({ ...prev, image: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Start editing mode
  const handleStartEdit = () => {
    if (filterData) {
      setEditData({
        name: filterData.name || '',
        description: filterData.description || '',
        image: filterData.image || '',
        price: filterData.price || '',
        ref: filterData.ref || '',
        ref1: filterData.ref1 || ''
      });
      setImagePreview(filterData.image || '');
      setIsEditing(true);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({ name: '', description: '', image: '', price: '', ref: '', ref1: '' });
    setImagePreview('');
    setSelectedImageFile(null);
  };

  // Save edited data
  const handleSaveEdit = () => {
    if (!filterData || !filterId) return;

    const updatedData = {
      ...filterData,
      name: editData.name || filterData.name,
      description: editData.description || filterData.description,
      image: editData.image || filterData.image,
      price: editData.price || filterData.price,
      ref: editData.ref || filterData.ref || '',
      ref1: editData.ref1 || filterData.ref1 || ''
    };

    // Update in customFilters or customLinks
    const customFilters = JSON.parse(localStorage.getItem('customFilters') || '[]');
    const customLinks = JSON.parse(localStorage.getItem('customLinks') || '[]');

    let updated = false;

    // Check if it's in customFilters (main filter or sub-link)
    for (let filter of customFilters) {
      // Check if it's the main filter
      if (filter.id === filterId || filter.url?.includes(filterId)) {
        const updatedFilters = customFilters.map((f: any) => 
          f.id === filter.id ? updatedData : f
        );
        localStorage.setItem('customFilters', JSON.stringify(updatedFilters));
        updated = true;
        break;
      }

      // Check if it's a sub-link
      if (filter.links && Array.isArray(filter.links)) {
        const linkIndex = filter.links.findIndex((link: any) => 
          link.id === filterId || link.url?.includes(filterId)
        );
        if (linkIndex !== -1) {
          filter.links[linkIndex] = updatedData;
          localStorage.setItem('customFilters', JSON.stringify(customFilters));
          updated = true;
          break;
        }
      }
    }

    // Check if it's in customLinks
    if (!updated) {
      const updatedLinks = customLinks.map((link: any) =>
        link.id === filterId || link.url?.includes(filterId) ? updatedData : link
      );
      localStorage.setItem('customLinks', JSON.stringify(updatedLinks));
    }

    setFilterData(updatedData);
    setIsEditing(false);
    setEditData({ name: '', description: '', image: '', price: '', ref: '', ref1: '' });
    setImagePreview('');
    setSelectedImageFile(null);
    alert('✅ Les données ont été mises à jour avec succès !');
  };

  // Handle price edit
  const handleEditPrice = () => {
    if (filterData) {
      setEditData(prev => ({ ...prev, price: filterData.price || '' }));
      setIsEditingPrice(true);
    }
  };

  const handleSavePrice = () => {
    if (!filterData || !filterId) return;

    const updatedData = {
      ...filterData,
      price: editData.price || filterData.price || ''
    };

    // Update in customFilters or customLinks
    const customFilters = JSON.parse(localStorage.getItem('customFilters') || '[]');
    const customLinks = JSON.parse(localStorage.getItem('customLinks') || '[]');

    let updated = false;

    // Check if it's in customFilters (main filter or sub-link)
    for (let filter of customFilters) {
      // Check if it's the main filter
      if (filter.id === filterId || filter.url?.includes(filterId)) {
        const updatedFilters = customFilters.map((f: any) => 
          f.id === filter.id ? updatedData : f
        );
        localStorage.setItem('customFilters', JSON.stringify(updatedFilters));
        updated = true;
        break;
      }

      // Check if it's a sub-link
      if (filter.links && Array.isArray(filter.links)) {
        const linkIndex = filter.links.findIndex((link: any) => 
          link.id === filterId || link.url?.includes(filterId)
        );
        if (linkIndex !== -1) {
          filter.links[linkIndex] = updatedData;
          localStorage.setItem('customFilters', JSON.stringify(customFilters));
          updated = true;
          break;
        }
      }
    }

    // Check if it's in customLinks
    if (!updated) {
      const updatedLinks = customLinks.map((link: any) =>
        link.id === filterId || link.url?.includes(filterId) ? updatedData : link
      );
      localStorage.setItem('customLinks', JSON.stringify(updatedLinks));
    }

    setFilterData(updatedData);
    setIsEditingPrice(false);
    setEditData(prev => ({ ...prev, price: '' }));
    alert('✅ Le prix a été mis à jour avec succès !');
  };

  const handleCancelPriceEdit = () => {
    setIsEditingPrice(false);
    setEditData(prev => ({ ...prev, price: '' }));
  };

  // Handle description edit
  const handleEditDescription = () => {
    setEditData(prev => ({ ...prev, description: filterData?.description || '' }));
    setIsEditingDescription(true);
  };

  const handleSaveDescription = () => {
    if (!filterId) return;
    
    const updatedData = {
      ...filterData,
      description: editData.description || filterData?.description || ''
    };

    const stored = JSON.parse(localStorage.getItem('customLinks') || '[]');
    const updated = stored.map((link: any) =>
      link.id === filterId ? updatedData : link
    );
    localStorage.setItem('customLinks', JSON.stringify(updated));

    const allFilters = JSON.parse(localStorage.getItem('filters') || '[]');
    const updatedFilters = allFilters.map((f: any) =>
      f.id === filterId ? updatedData : f
    );
    localStorage.setItem('filters', JSON.stringify(updatedFilters));

    setFilterData(updatedData);
    setIsEditingDescription(false);
    setEditData(prev => ({ ...prev, description: '' }));
    alert('✅ La description a été mise à jour avec succès !');
  };

  const handleCancelDescriptionEdit = () => {
    setIsEditingDescription(false);
    setEditData(prev => ({ ...prev, description: '' }));
  };

  // Handle name edit
  const handleEditName = () => {
    setEditData(prev => ({ ...prev, name: filterData?.name || '' }));
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (!filterId) return;
    
    const updatedData = {
      ...filterData,
      name: editData.name || filterData?.name || ''
    };

    const stored = JSON.parse(localStorage.getItem('customLinks') || '[]');
    const updated = stored.map((link: any) =>
      link.id === filterId ? updatedData : link
    );
    localStorage.setItem('customLinks', JSON.stringify(updated));

    const allFilters = JSON.parse(localStorage.getItem('filters') || '[]');
    const updatedFilters = allFilters.map((f: any) =>
      f.id === filterId ? updatedData : f
    );
    localStorage.setItem('filters', JSON.stringify(updatedFilters));

    setFilterData(updatedData);
    setIsEditingName(false);
    setEditData(prev => ({ ...prev, name: '' }));
    alert('✅ Le nom du produit a été mis à jour avec succès !');
  };

  const handleCancelNameEdit = () => {
    setIsEditingName(false);
    setEditData(prev => ({ ...prev, name: '' }));
  };

  // Handle refs edit
  const handleEditRefs = () => {
    setIsEditingRefs(true);
  };

  const handleSaveRefs = () => {
    if (!filterId) return;
    
    const updatedData = {
      ...filterData,
      referenceFields: referenceFields.filter(field => field.label.trim() !== '' || field.value.trim() !== ''),
      // Keep old format for backward compatibility
      ref: referenceFields.find(f => f.id === 'ref')?.value || '',
      ref1: referenceFields.find(f => f.id === 'ref1')?.value || ''
    };

    const stored = JSON.parse(localStorage.getItem('customLinks') || '[]');
    const updated = stored.map((link: any) =>
      link.id === filterId ? updatedData : link
    );
    localStorage.setItem('customLinks', JSON.stringify(updated));

    const allFilters = JSON.parse(localStorage.getItem('filters') || '[]');
    const updatedFilters = allFilters.map((f: any) =>
      f.id === filterId ? updatedData : f
    );
    localStorage.setItem('filters', JSON.stringify(updatedFilters));

    setFilterData(updatedData);
    setIsEditingRefs(false);
    alert('✅ Les références ont été mises à jour avec succès !');
  };

  const handleCancelRefsEdit = () => {
    setIsEditingRefs(false);
    // Reload reference fields from filterData
    if (filterData) {
      if (filterData.referenceFields && Array.isArray(filterData.referenceFields)) {
        setReferenceFields(filterData.referenceFields);
      } else {
        const fields: Array<{id: string, label: string, value: string}> = [];
        if (filterData.ref) fields.push({ id: 'ref', label: 'Réf', value: filterData.ref });
        if (filterData.ref1) fields.push({ id: 'ref1', label: 'Code usine', value: filterData.ref1 });
        if (fields.length === 0) {
          fields.push({ id: 'ref', label: 'Réf', value: '' });
          fields.push({ id: 'ref1', label: 'Code usine', value: '' });
        }
        setReferenceFields(fields);
      }
    }
  };

  // Handle add reference field
  const handleAddReferenceField = () => {
    const newField = {
      id: `ref_${Date.now()}`,
      label: 'Nouveau champ',
      value: ''
    };
    setReferenceFields(prev => [...prev, newField]);
  };

  // Handle delete reference field
  const handleDeleteReferenceField = (id: string) => {
    if (referenceFields.length <= 1) {
      alert('⚠️ Vous devez garder au moins un champ de référence.');
      return;
    }
    setReferenceFields(prev => prev.filter(field => field.id !== id));
  };

  // Handle update reference field
  const handleUpdateReferenceField = (id: string, field: 'label' | 'value', newValue: string) => {
    setReferenceFields(prev => prev.map(f => 
      f.id === id ? { ...f, [field]: newValue } : f
    ));
  };

  // Handle delete
  const handleDelete = () => {
    if (!filterData || !filterId) return;

    const customFilters = JSON.parse(localStorage.getItem('customFilters') || '[]');
    const customLinks = JSON.parse(localStorage.getItem('customLinks') || '[]');

    let deleted = false;

    // Check if it's in customFilters
    for (let filter of customFilters) {
      // Check if it's the main filter
      if (filter.id === filterId || filter.url?.includes(filterId)) {
        const updatedFilters = customFilters.filter((f: any) => f.id !== filter.id);
        localStorage.setItem('customFilters', JSON.stringify(updatedFilters));
        deleted = true;
        alert('✅ تم حذف الفلتر بنجاح!');
        navigate('/');
        break;
      }

      // Check if it's a sub-link
      if (filter.links && Array.isArray(filter.links)) {
        const linkIndex = filter.links.findIndex((link: any) => 
          link.id === filterId || link.url?.includes(filterId)
        );
        if (linkIndex !== -1) {
          filter.links.splice(linkIndex, 1);
          localStorage.setItem('customFilters', JSON.stringify(customFilters));
          deleted = true;
          alert('✅ تم حذف الرابط الفرعي بنجاح!');
          navigate('/');
          break;
        }
      }
    }

    // Check if it's in customLinks
    if (!deleted) {
      const updatedLinks = customLinks.filter((link: any) =>
        link.id !== filterId && !link.url?.includes(filterId)
      );
      localStorage.setItem('customLinks', JSON.stringify(updatedLinks));
      alert('✅ تم حذف الرابط بنجاح!');
      navigate('/');
    }

    setShowDeleteConfirm(false);
  };

  // Handle Modèle management functions
  const handleAddModele = () => {
    if (newModele.trim()) {
      const updated = [...modeles, newModele.trim()];
      setModeles(updated);
      localStorage.setItem('filterModeles', JSON.stringify(updated));
      setNewModele('');
      setShowAddModele(false);
    }
  };

  const handleEditModele = (index: number) => {
    setEditingModeleIndex(index);
    setEditModeleValue(modeles[index]);
  };

  const handleSaveEditModele = () => {
    if (editingModeleIndex !== null && editModeleValue.trim()) {
      const updated = [...modeles];
      updated[editingModeleIndex] = editModeleValue.trim();
      setModeles(updated);
      localStorage.setItem('filterModeles', JSON.stringify(updated));
      setEditingModeleIndex(null);
      setEditModeleValue('');
    }
  };

  const handleDeleteModele = (index: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      const updated = modeles.filter((_, i) => i !== index);
      setModeles(updated);
      localStorage.setItem('filterModeles', JSON.stringify(updated));
    }
  };

  // Handle Motorisation management functions
  const handleAddMotorisation = () => {
    if (newMotorisation.trim()) {
      const updated = [...motorisations, newMotorisation.trim()];
      setMotorisations(updated);
      localStorage.setItem('filterMotorisations', JSON.stringify(updated));
      setNewMotorisation('');
      setShowAddMotorisation(false);
    }
  };

  const handleEditMotorisation = (index: number) => {
    setEditingMotorisationIndex(index);
    setEditMotorisationValue(motorisations[index]);
  };

  const handleSaveEditMotorisation = () => {
    if (editingMotorisationIndex !== null && editMotorisationValue.trim()) {
      const updated = [...motorisations];
      updated[editingMotorisationIndex] = editMotorisationValue.trim();
      setMotorisations(updated);
      localStorage.setItem('filterMotorisations', JSON.stringify(updated));
      setEditingMotorisationIndex(null);
      setEditMotorisationValue('');
    }
  };

  const handleDeleteMotorisation = (index: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette motorisation ?')) {
      const updated = motorisations.filter((_, i) => i !== index);
      setMotorisations(updated);
      localStorage.setItem('filterMotorisations', JSON.stringify(updated));
    }
  };

  useEffect(() => {
    // جلب البيانات المحفوظة من localStorage
    const customFilters = JSON.parse(localStorage.getItem('customFilters') || '[]');
    const customLinks = JSON.parse(localStorage.getItem('customLinks') || '[]');
    
    console.log('🔍 Searching for filter with ID:', filterId);
    console.log('📁 Custom Filters:', customFilters);
    console.log('🔗 Custom Links:', customLinks);
    
    let foundFilter = null;
    
    // البحث في customFilters أولاً (للفلاتر الجديدة المضافة)
    for (const filter of customFilters) {
      // التحقق من الفلتر نفسه
      const filterIdFromUrl = filter.url?.split('/filter/')[1];
      const filterMatches = filter.id === filterId || filterIdFromUrl === filterId || filter.url?.includes(filterId);
      
      if (filterMatches) {
        console.log(`✅ Found filter itself: ${filter.name} (ID: ${filter.id})`);
        foundFilter = filter;
        break;
      }
      
      // البحث في الروابط الفرعية داخل الفلتر
      if (filter.links && Array.isArray(filter.links)) {
        for (const link of filter.links) {
          const linkIdFromUrl = link.url?.split('/filter/')[1];
          const linkMatches = link.id === filterId || linkIdFromUrl === filterId || link.url?.includes(filterId);
          
          if (linkMatches) {
            console.log(`✅ Found sub-link in filter "${filter.name}": ${link.name} (ID: ${link.id})`);
            console.log(`🖼️ Sub-link image: ${link.image ? 'Present' : 'Missing'}`);
            foundFilter = link; // استخدام بيانات الرابط الفرعي
            break;
          }
        }
        
        if (foundFilter) break;
      }
    }

    // إذا لم يتم العثور عليه، ابحث في customLinks
    if (!foundFilter) {
      console.log('🔍 Not found in customFilters, searching in customLinks...');
      foundFilter = customLinks.find(
        (link: any) => {
          const linkIdFromUrl = link.url?.split('/filter/')[1];
          const matches = link.id === filterId || linkIdFromUrl === filterId || link.url?.includes(filterId);
          if (matches) {
            console.log(`✅ Found in customLinks: ${link.name} (ID: ${link.id})`);
          }
          return matches;
        }
      );
    }

    // إذا لم يتم العثور على الفلتر، استخدم آخر فلتر/رابط تم إضافته
    if (!foundFilter) {
      // البحث في الروابط الفرعية أيضاً
      for (const filter of customFilters) {
        if (filter.links && filter.links.length > 0) {
          foundFilter = filter.links[filter.links.length - 1];
          console.log('🔄 Using latest sub-link:', foundFilter);
          break;
        }
      }
      
      if (!foundFilter && customFilters.length > 0) {
        foundFilter = customFilters[customFilters.length - 1];
        console.log('🔄 Using latest custom filter:', foundFilter);
      } else if (!foundFilter && customLinks.length > 0) {
        foundFilter = customLinks[customLinks.length - 1];
        console.log('🔄 Using latest custom link:', foundFilter);
      }
    }

    if (foundFilter) {
      console.log('✅ Final Filter Data:', foundFilter);
      console.log('🖼️ Filter Image:', foundFilter.image ? 'Present' : 'Missing');
      console.log('📏 Image Length:', foundFilter.image?.length);
      console.log('🔍 Image Type:', typeof foundFilter.image);
      console.log('📊 Image starts with data:', foundFilter.image?.startsWith('data:'));
      
      // تنظيف بيانات الصورة
      const cleanImage = foundFilter.image?.trim();
      if (cleanImage && cleanImage !== '') {
        foundFilter.image = cleanImage;
        console.log('✅ Image cleaned and set');
      } else {
        console.log('⚠️ Image is empty or invalid');
      }
      
      setFilterData(foundFilter);
    } else {
      console.log('❌ No filter found, using default data');
      setFilterData({
        id: filterId,
        name: 'Filtre à Huile Premium',
        image: '/ff.png',
        description: 'Filtre de qualité supérieure pour votre véhicule'
      });
    }
  }, [filterId]);

  // Load reference fields from filterData
  useEffect(() => {
    if (filterData) {
      // Check if filterData has referenceFields array
      if (filterData.referenceFields && Array.isArray(filterData.referenceFields) && filterData.referenceFields.length > 0) {
        setReferenceFields(filterData.referenceFields);
      } else {
        // Convert old ref/ref1 format to new referenceFields format
        const fields: Array<{id: string, label: string, value: string}> = [];
        if (filterData.ref !== undefined && filterData.ref !== null && filterData.ref !== '') {
          fields.push({ id: 'ref', label: 'Réf', value: filterData.ref });
        }
        if (filterData.ref1 !== undefined && filterData.ref1 !== null && filterData.ref1 !== '') {
          fields.push({ id: 'ref1', label: 'Code usine', value: filterData.ref1 });
        }
        // If no fields exist, add default ones
        if (fields.length === 0) {
          fields.push({ id: 'ref', label: 'Réf', value: '' });
          fields.push({ id: 'ref1', label: 'Code usine', value: '' });
        }
        setReferenceFields(fields);
      }
    }
  }, [filterData]);

  // Load multiple images from filterData
  useEffect(() => {
    if (filterData) {
      // Check if filterData has multiple images array
      if (filterData.images && Array.isArray(filterData.images) && filterData.images.length > 0) {
        setProductImages(filterData.images);
      } else if (filterData.image && filterData.image.trim() !== '') {
        // If only one image, create array with 3 default images
        setProductImages([
          filterData.image,
          '/ff.png',
          '/ll.png'
        ]);
      } else {
        // Default images
        setProductImages([
          '/ff.png',
          '/ll.png',
          '/ff.png'
        ]);
      }
      setCurrentImageIndex(0);
    }
  }, [filterData]);

  // Navigation functions for image carousel
  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  const handleDotClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  // Handle image file selection for admin
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add new image to carousel
  const handleAddImage = () => {
    if (!newImagePreview) {
      alert('⚠️ Veuillez sélectionner une image');
      return;
    }

    const updatedImages = [...productImages, newImagePreview];
    setProductImages(updatedImages);
    
    // Update in localStorage
    updateFilterImages(updatedImages);
    
    setNewImagePreview('');
    setNewImageFile(null);
    alert('✅ Image ajoutée avec succès!');
  };

  // Replace existing image
  const handleReplaceImage = (index: number) => {
    if (!newImagePreview) {
      alert('⚠️ Veuillez sélectionner une image');
      return;
    }

    const updatedImages = [...productImages];
    updatedImages[index] = newImagePreview;
    setProductImages(updatedImages);
    
    // Update in localStorage
    updateFilterImages(updatedImages);
    
    setEditingImageIndex(null);
    setNewImagePreview('');
    setNewImageFile(null);
    alert('✅ Image remplacée avec succès!');
  };

  // Delete image from carousel
  const handleDeleteImage = (index: number) => {
    if (productImages.length <= 1) {
      alert('⚠️ Vous devez garder au moins une image');
      return;
    }

    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette image?')) {
      const updatedImages = productImages.filter((_, i) => i !== index);
      setProductImages(updatedImages);
      
      // Update in localStorage
      updateFilterImages(updatedImages);
      
      // Adjust current index if needed
      if (currentImageIndex >= updatedImages.length) {
        setCurrentImageIndex(updatedImages.length - 1);
      }
      
      alert('✅ Image supprimée avec succès!');
    }
  };

  // Update images in localStorage
  const updateFilterImages = (images: string[]) => {
    if (!filterData || !filterId) return;

    const updatedData = {
      ...filterData,
      images: images
    };

    // Update in customFilters or customLinks
    const customFilters = JSON.parse(localStorage.getItem('customFilters') || '[]');
    const customLinks = JSON.parse(localStorage.getItem('customLinks') || '[]');

    let updated = false;

    // Check if it's in customFilters
    for (let filter of customFilters) {
      if (filter.id === filterId || filter.url?.includes(filterId)) {
        const updatedFilters = customFilters.map((f: any) => 
          f.id === filter.id ? updatedData : f
        );
        localStorage.setItem('customFilters', JSON.stringify(updatedFilters));
        updated = true;
        break;
      }

      // Check sub-links
      if (filter.links && Array.isArray(filter.links)) {
        const linkIndex = filter.links.findIndex((link: any) => 
          link.id === filterId || link.url?.includes(filterId)
        );
        if (linkIndex !== -1) {
          filter.links[linkIndex] = updatedData;
          localStorage.setItem('customFilters', JSON.stringify(customFilters));
          updated = true;
          break;
        }
      }
    }

    // Check if it's in customLinks
    if (!updated) {
      const updatedLinks = customLinks.map((link: any) =>
        link.id === filterId || link.url?.includes(filterId) ? updatedData : link
      );
      localStorage.setItem('customLinks', JSON.stringify(updatedLinks));
    }

    setFilterData(updatedData);
  };

  // البيانات الافتراضية
  const popularBrands = ['RENAULT', 'PEUGEOT', 'VW', 'CITROËN', 'BMW', 'AUDI', 'MERCEDES', 'FORD', 'OPEL', 'FIAT'];
  
  const popularModels = [
    { name: 'GOLF', engine: '1.4 TSI', image: '/ff.png' },
    { name: 'CLIO', engine: '1.5 DCI', image: '/ll.png' },
    { name: 'SÉRIE 3', engine: '2.0 TDI', image: '/ff.png' },
    { name: 'MÉGANE', engine: '1.6 DCI', image: '/ll.png' },
    { name: 'C4', engine: '1.6 HDI', image: '/ff.png' },
    { name: 'C3', engine: '1.2 PureTech', image: '/ll.png' },
    { name: 'A3', engine: '1.4 TFSI', image: '/ff.png' },
    { name: '206', engine: '1.4 HDI', image: '/ll.png' },
    { name: 'POLO', engine: '1.0 TSI', image: '/ff.png' },
    { name: '208', engine: '1.2 PureTech', image: '/ll.png' }
  ];

  const bestSellers = [
    {
      id: 1,
      brand: 'Brembo',
      name: 'Disque de frein',
      price: '39,84 €',
      rating: 5,
      image: '/ff.png',
      compatible: 'Compatible avec BMW E90'
    },
    {
      id: 2,
      brand: 'ATE',
      name: 'Disque de frein',
      price: '44,33 €',
      rating: 5,
      image: '/ll.png',
      compatible: 'Compatible avec BMW E90'
    },
    {
      id: 3,
      brand: 'Bosch',
      name: 'Plaquettes de frein',
      price: '28,50 €',
      rating: 5,
      image: '/ff.png',
      compatible: 'Compatible avec VW Golf'
    }
  ];

  const bigBrands = ['MOOG', 'BOSCH', 'Brembo', 'ATE', 'VALEO', 'CONTINENTAL', 'MANN', 'MAHLE'];

  const partCategories: Array<{ name: string; icon: React.ComponentType<{ className?: string }> }> = [
    { name: 'Moteur', icon: Cog },
    { name: 'Freinage', icon: Circle },
    { name: 'Filtration', icon: Filter },
    { name: 'Refroidissement', icon: Droplets },
    { name: 'Éclairage', icon: Lightbulb },
    { name: 'Suspenion', icon: Gauge },
    { name: 'Suspension', icon: Zap },
    { name: 'Lemoten', icon: Wrench }
  ];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
    }
  };

  const handleFilterClick = (category: any) => {
    navigate(`/filter/${Date.now()}`);
  };

  // Handle order submission
  const handleSubmitOrder = () => {
    // التحقق من الحقول
    if (!orderData.phone || !orderData.firstName || !orderData.lastName || !orderData.governorate) {
      alert('⚠️ Veuillez remplir tous les champs');
      return;
    }

    // إنشاء رسالة الطلب
    const unitPrice = filterData?.price ? parseFloat(filterData.price) : 0;
    const totalPrice = calculateTotalPrice(filterData?.price || '0', commanderQuantity);
    const orderMessage = `
📦 Nouvelle commande:
━━━━━━━━━━━━━━━━━━
🛍️ Produit: ${filterData?.name || 'N/A'}
💰 Prix unitaire: ${unitPrice.toFixed(2)} TND
📊 Quantité: ${commanderQuantity} ${commanderQuantity === 1 ? 'unité' : 'unités'}
💵 Total: ${totalPrice} TND

👤 Informations client:
• Nom: ${orderData.lastName}
• Prénom: ${orderData.firstName}
• Téléphone: ${orderData.phone}
• Gouvernorat: ${orderData.governorate}

${selectedModele ? `🚗 Modèle: ${selectedModele}` : ''}
${selectedMotorisation ? `⚙️ Motorisation: ${selectedMotorisation}` : ''}
━━━━━━━━━━━━━━━━━━
`;

    // حفظ الطلب في localStorage
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const newOrder = {
      id: Date.now(),
      date: new Date().toISOString(),
      product: {
        name: filterData?.name || 'N/A',
        price: filterData?.price || 'N/A',
        ref: filterData?.ref || '',
        ref1: filterData?.ref1 || ''
      },
      quantity: commanderQuantity,
      totalPrice: totalPrice,
      customer: {
        firstName: orderData.firstName,
        lastName: orderData.lastName,
        phone: orderData.phone,
        governorate: orderData.governorate
      },
      modele: selectedModele || '',
      motorisation: selectedMotorisation || '',
      status: 'pending'
    };
    
    orders.push(newOrder);
    localStorage.setItem('orders', JSON.stringify(orders));

    // إغلاق النافذة وإعادة تعيين البيانات
    setShowOrderForm(false);
    setShowCommanderQuantity(false);
    setCommanderQuantity(1);
    setOrderData({ phone: '', firstName: '', lastName: '', governorate: '' });
    
    // رسالة نجاح مع خيار إرسال عبر واتساب
    if (window.confirm('✅ Votre commande a été enregistrée avec succès!\n\n📱 Voulez-vous envoyer cette commande via WhatsApp?')) {
      const whatsappUrl = `https://wa.me/21623167813?text=${encodeURIComponent(orderMessage)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* 🎯 Hero Section - القسم الرئيسي */}
      {/* 
        ✅ Hero Section احترافي:
        - صورة خلفية عالية الجودة لسيارة
        - نص جذاب في المنتصف
        - زر CTA أنيق (#ff6600)
        - overlay داكن للنص
      */}
      {!filterId && (
        <section className="relative w-full h-[60vh] lg:h-[80vh] xl:h-[85vh] 2xl:h-[90vh] flex items-center justify-center overflow-hidden">
          {/* Mobile/Tablet Background - Keep original with image */}
          <div className="lg:hidden absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/70"></div>
          </div>

          {/* PC Background - Premium White Background */}
          <div className="hidden lg:block absolute inset-0 bg-white"></div>

          {/* ✅ Decorative Watermark - rannenautomotors (Large Screens Only) - White with enhanced visibility */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-[-15deg]"
              style={{
                fontSize: 'clamp(8rem, 20vw, 18rem)',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '0.5rem',
                whiteSpace: 'nowrap',
                fontFamily: 'Arial, sans-serif',
                textTransform: 'uppercase',
                userSelect: 'none',
                textShadow: '4px 4px 8px rgba(0, 0, 0, 0.15), 2px 2px 4px rgba(0, 0, 0, 0.12), 0 0 40px rgba(0, 0, 0, 0.1), 0 0 80px rgba(0, 0, 0, 0.08), 0 0 120px rgba(0, 0, 0, 0.05)',
                WebkitTextStroke: '3px rgba(0, 0, 0, 0.15)',
                stroke: 'rgba(0, 0, 0, 0.15)',
                filter: 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 8px rgba(0, 0, 0, 0.1))'
              }}
            >
              rannenautomotors
            </div>
          </div>

          {/* Content - Optimized for large screens with better centering */}
          <div className="relative z-10 max-w-[1400px] xl:max-w-[1600px] mx-auto px-8 lg:px-12 xl:px-20 2xl:px-24 text-center">
            {/* Mobile/Tablet Text - White */}
            <h1 className="lg:hidden text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 lg:mb-8 xl:mb-10 2xl:mb-12 drop-shadow-2xl">
              Découvrez les Meilleures Pièces Auto
            </h1>
            <p className="lg:hidden text-lg sm:text-xl md:text-2xl text-white/90 mb-8 lg:mb-12 xl:mb-14 2xl:mb-16 max-w-4xl mx-auto drop-shadow-lg">
              Qualité garantie, prix compétitifs, livraison rapide. Plus de 20 ans d'expérience à votre service.
            </p>

            {/* PC Text - Dark on White Background */}
            <h1 className="hidden lg:block text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold text-gray-900 mb-6 lg:mb-8 xl:mb-10 2xl:mb-12" style={{ fontSize: 'clamp(2.5rem, 5vw + 1rem, 5rem)' }}>
              Découvrez les Meilleures Pièces Auto
            </h1>
            <p className="hidden lg:block text-lg lg:text-xl xl:text-2xl 2xl:text-3xl text-gray-700 mb-8 lg:mb-12 xl:mb-14 2xl:mb-16 max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto" style={{ fontSize: 'clamp(1.125rem, 2vw + 0.5rem, 2rem)' }}>
              Qualité garantie, prix compétitifs, livraison rapide. Plus de 20 ans d'expérience à votre service.
            </p>
            
            <button
              onClick={() => navigate('/products')}
              className="px-8 py-4 lg:px-12 lg:py-5 xl:px-16 xl:py-6 2xl:px-20 2xl:py-7 text-lg lg:text-xl xl:text-2xl 2xl:text-3xl font-bold text-white rounded-lg transition-all duration-300 shadow-2xl hover:shadow-orange-500/50 transform hover:scale-110"
              style={{ backgroundColor: '#ff6600', fontSize: 'clamp(1.125rem, 1.5vw + 0.5rem, 2rem)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e55a00'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff6600'}
            >
              Explorer Maintenant
            </button>
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="pt-0">

      {/* UPDATED: Product Detail - Modern E-commerce Two-Column Layout */}
      {filterData && (
        <section className="bg-gradient-to-br from-[#F7F8FA] to-white py-8 sm:py-12 md:py-16 lg:py-20 xl:py-28">
          <div className="w-full max-w-[1400px] lg:max-w-7xl xl:max-w-8xl mx-auto px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16">
            <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] border border-gray-100/50 overflow-hidden">
              <div className="p-6 md:p-8 lg:p-10 xl:p-12">
                {/* UPDATED: Admin Control Buttons */}
                {isAdmin && !isEditing && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <button
                      onClick={handleStartEdit}
                      className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg sm:rounded-xl transition-all duration-300 shadow-md hover:shadow-lg text-sm sm:text-base"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="font-semibold">Modifier</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg sm:rounded-xl transition-all duration-300 shadow-md hover:shadow-lg text-sm sm:text-base"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="font-semibold">Supprimer</span>
                    </button>
                  </div>
                )}

                {/* UPDATED: Editing Form */}
                {isAdmin && isEditing ? (
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nom du filtre
                      </label>
                      <Input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full"
                        placeholder="Nom du filtre"
          />
        </div>
        
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ref
                      </label>
                      <Input
                        type="text"
                        value={editData.ref}
                        onChange={(e) => setEditData(prev => ({ ...prev, ref: e.target.value }))}
                        className="w-full"
                        placeholder="Référence du produit"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Ref1
                      </label>
                      <Input
                        type="text"
                        value={editData.ref1}
                        onChange={(e) => setEditData(prev => ({ ...prev, ref1: e.target.value }))}
                        className="w-full"
                        placeholder="Référence secondaire"
                      />
          </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        rows={3}
                        placeholder="Description"
                      />
          </div>
          
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {imagePreview && (
                        <div className="mt-2">
                          <img src={imagePreview} alt="Preview" className="w-32 h-32 object-contain rounded" />
              </div>
          )}
        </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Enregistrer
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </button>
          </div>
        </div>
                ) : (
                  <div className="space-y-6 sm:space-y-8 lg:space-y-10">
                    {/* Ultra-Luxury Two-Column Grid Layout - Desktop Optimized */}
                    <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 md:gap-10 lg:gap-14 xl:gap-16 items-start">
                      {/* Left Column - Premium Gallery with Sticky Thumbnails */}
                      <div className="space-y-6">
                        {/* Main Product Image - Ultra-Luxury Desktop */}
                        <div className="relative aspect-[4/3] lg:h-[500px] xl:h-[600px] 2xl:h-[700px] bg-gradient-to-br from-[#F7F8FA] to-white rounded-2xl border border-gray-200/50 overflow-hidden group shadow-[var(--shadow-card)] luxury-hover-scale">
              {productImages.length > 0 ? (
                <>
                  <div className="relative w-full h-full">
                    {productImages.map((image, index) => (
                      <div
                        key={index}
                        className={`absolute inset-0 w-full h-full transition-all duration-500 ease-in-out ${
                                      index === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                        }`}
                      >
                        <img 
                          src={image} 
                          alt={`${filterData.name} - Image ${index + 1}`}
                          className="w-full h-full object-contain bg-white transition-transform duration-700 ease-out group-hover:scale-110"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/ff.png';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {productImages.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 p-3 rounded-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 shadow-lg hover:shadow-xl luxury-transition-fast z-10 touch-manipulation"
                        aria-label="Image précédente"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-900 p-3 rounded-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 shadow-lg hover:shadow-xl luxury-transition-fast z-10 touch-manipulation"
                        aria-label="Image suivante"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                                  <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-10">
                        {productImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => handleDotClick(index)}
                                        className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 touch-manipulation ${
                                          index === currentImageIndex ? 'w-6 sm:w-8 bg-orange-500' : 'w-3 sm:w-4 bg-white/50'
                                        }`}
                                        aria-label={`Voir l'image ${index + 1}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowImageManager(true);
                      }}
                                  className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-blue-500/90 hover:bg-blue-600 active:bg-blue-700 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-full text-xs font-semibold shadow-lg z-20 touch-manipulation"
                    >
                                  <span className="hidden sm:inline">Gérer les images</span>
                                  <span className="sm:hidden">Gérer</span>
                    </button>
                  )}
                </>
              ) : (
                            <div className="flex flex-col items-center justify-center text-gray-400 gap-2 h-full">
                              <Car className="w-14 h-14" />
                              <p className="text-sm">Aucune image disponible</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowImageManager(true)}
                                  className="mt-2 text-xs px-4 py-2 bg-blue-500 text-white rounded-full"
                    >
                      Ajouter des images
                    </button>
                  )}
                </div>
              )}
            </div>
            
                        {/* Ultra-Luxury Thumbnail Slider */}
                        {productImages.length > 1 && (
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide luxury-scrollbar">
                            {productImages.map((image, index) => (
                <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`relative h-20 w-20 md:h-24 md:w-24 flex-shrink-0 rounded-xl border-2 transition-all touch-manipulation overflow-hidden ${
                                  index === currentImageIndex
                                    ? 'border-[#F97316] shadow-[var(--shadow-glow-orange)] scale-105'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                aria-label={`Miniature ${index + 1}`}
                              >
                                <img
                                  src={image}
                                  alt={`Miniature ${index + 1}`}
                                  className="w-full h-full object-cover luxury-transition-fast hover:scale-110"
                                  loading="lazy"
                                />
                </button>
                            ))}
              </div>
            )}
            
                        {/* UPDATED: Product Description Field */}
                        <div className="mt-4 sm:mt-6">
                          <div className="flex items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="inline-flex h-6 sm:h-8 w-0.5 sm:w-1 rounded-full bg-blue-600" aria-hidden />
                              <div>
                                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.35em] text-blue-500">DESCRIPTION</p>
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Détails & compatibilité</h3>
                              </div>
                            </div>
                            {isAdmin && !isEditingDescription && (
                  <button
                                onClick={handleEditDescription}
                                className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 touch-manipulation"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                            )}
                          </div>
                          {isAdmin && isEditingDescription ? (
                            <div className="space-y-3">
                              <textarea
                                value={editData.description}
                                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full min-h-[150px] sm:min-h-[200px] px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-800 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                                placeholder="Entrez la description du produit..."
                              />
                              <div className="flex gap-2 sm:gap-3">
                  <button
                                  onClick={handleSaveDescription}
                                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg sm:rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 touch-manipulation"
                                >
                                  <Save className="w-4 h-4" />
                                  Enregistrer
                                </button>
                                <button
                                  onClick={handleCancelDescriptionEdit}
                                  className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white rounded-lg sm:rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 touch-manipulation"
                                >
                                  <X className="w-4 h-4" />
                                  Annuler
                  </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-4 sm:p-6 min-h-[150px] sm:min-h-[200px]">
                              <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {filterData.description || 'Aucune description disponible pour ce produit.'}
                              </p>
                </div>
              )}
                        </div>
                  </div>
                  
                      {/* Right Column - Ultra-Luxury Purchase Card (Sticky Desktop) */}
                      <div className="lg:sticky lg:top-28 xl:top-32 space-y-6 lg:space-y-8">
                        {/* Product Title & Reference */}
                        <div className="space-y-4">
                          {isAdmin && isEditingName ? (
                            <div className="space-y-4">
                    <Input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Nom du produit"
                                className="w-full text-[28px] md:text-[32px] lg:text-[36px] font-[700] text-gray-900 px-4 py-3 border-2 border-blue-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 luxury-focus-ring-orange"
                              />
                              <div className="flex gap-2 sm:gap-3">
                                <button
                                  onClick={handleSaveName}
                                  className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg sm:rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 touch-manipulation"
                                >
                                  <Save className="w-4 h-4" />
                                  Enregistrer
                                </button>
                                <button
                                  onClick={handleCancelNameEdit}
                                  className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white rounded-lg sm:rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 touch-manipulation"
                                >
                                  <X className="w-4 h-4" />
                                  Annuler
                                </button>
                  </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-4">
                              <h3 className="text-[28px] md:text-[32px] lg:text-[36px] font-[700] text-gray-900 leading-[1.2] tracking-[-0.02em] flex-1">
                                {filterData.name}
                              </h3>
                              {isAdmin && (
                                <button
                                  onClick={handleEditName}
                                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg luxury-transition-fast flex items-center gap-2 flex-shrink-0"
                                >
                                  <Edit className="w-4 h-4" />
                                  Modifier
                                </button>
                              )}
                            </div>
                          )}
                          <div className="space-y-3">
                            {isAdmin && isEditingRefs ? (
                              <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="space-y-3">
                                  {referenceFields.map((field, index) => (
                                    <div key={field.id} className="space-y-2 p-3 bg-white rounded-lg border border-gray-300">
                                      <div className="flex items-center justify-between gap-2">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700 flex-1">
                                          Nom du champ {index + 1}
                    </label>
                                        {referenceFields.length > 1 && (
                                          <button
                                            onClick={() => handleDeleteReferenceField(field.id)}
                                            className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                                            title="Supprimer ce champ"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                    <Input
                      type="text"
                                        value={field.label}
                                        onChange={(e) => handleUpdateReferenceField(field.id, 'label', e.target.value)}
                                        placeholder="Nom du champ (ex: Réf, Code usine)"
                                        className="w-full text-sm sm:text-base"
                                      />
                                      <div className="space-y-1">
                                        <label className="block text-xs sm:text-sm font-semibold text-gray-700">
                                          Valeur
                    </label>
                    <Input
                      type="text"
                                          value={field.value}
                                          onChange={(e) => handleUpdateReferenceField(field.id, 'value', e.target.value)}
                                          placeholder="Valeur du champ"
                                          className="w-full text-sm sm:text-base"
                    />
                  </div>
                  </div>
                                  ))}
                      </div>
                    <button
                                  onClick={handleAddReferenceField}
                                  className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg sm:rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 touch-manipulation"
                                >
                                  <Circle className="w-4 h-4" />
                                  Ajouter un champ
                                </button>
                                <div className="flex gap-2 sm:gap-3 pt-2 border-t border-gray-300">
                                  <button
                                    onClick={handleSaveRefs}
                                    className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg sm:rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <Save className="w-4 h-4" />
                      Enregistrer
                    </button>
                    <button
                                    onClick={handleCancelRefsEdit}
                                    className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white rounded-lg sm:rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 touch-manipulation"
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </button>
                  </div>
                </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                                {referenceFields.length > 0 ? (
                                  referenceFields.map((field) => (
                                    <span key={field.id} className="inline-flex items-center gap-1.5 sm:gap-2">
                                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                                      {field.label} : <strong className="text-gray-800">{field.value || 'N/A'}</strong>
                                    </span>
                                  ))
              ) : (
                <>
                                    <span className="inline-flex items-center gap-1.5 sm:gap-2">
                                      <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                                      Réf : <strong className="text-gray-800">{filterData.ref || 'N/A'}</strong>
                      </span>
                                    <span className="inline-flex items-center gap-1.5 sm:gap-2">
                                      <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                                      Code usine : <strong className="text-gray-800">{filterData.ref1 || 'N/A'}</strong>
                      </span>
                                  </>
                                )}
                    {isAdmin && (
                                  <button
                                    onClick={handleEditRefs}
                                    className="ml-auto px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 touch-manipulation"
                                  >
                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                    Modifier
                                  </button>
                                )}
                      </div>
                    )}
                          </div>
                  </div>
                  
                        {/* Ultra-Luxury Price Section */}
                        <div className="luxury-card-premium bg-gradient-to-br from-orange-50/80 to-white border-2 border-orange-200/50 p-6 md:p-8">
                    {isEditingPrice ? (
                            <div className="space-y-3">
                              <label className="block text-xs sm:text-sm font-semibold text-gray-700">Prix (TND)</label>
                              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <Input
                            type="number"
                            value={editData.price}
                            onChange={(e) => setEditData(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="Prix en TND"
                                  className="flex-1 text-base sm:text-lg font-semibold"
                            min="0"
                            step="0.01"
                          />
                                <span className="inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl bg-white text-xs sm:text-sm font-semibold text-gray-700">
                                  TND
                                </span>
                          <button
                            onClick={handleSavePrice}
                                  className="px-3 sm:px-4 py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold shadow touch-manipulation"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelPriceEdit}
                                  className="px-3 sm:px-4 py-2 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold shadow touch-manipulation"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                            <div className="space-y-3">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                                <div className="flex-1">
                                  <p className="text-[10px] sm:text-xs font-semibold text-orange-600 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1">
                                    Prix TTC (unité)
                                  </p>
                                  <div className="flex items-baseline gap-3">
                                    <span className="text-[36px] md:text-[42px] lg:text-[48px] font-[700] text-[#F97316] tracking-tight">
                            {filterData.price ? `${parseFloat(filterData.price).toFixed(2)}` : 'N/A'} 
                          </span>
                                    {filterData.price && (
                                      <span className="text-lg md:text-xl font-semibold text-gray-700">TND</span>
                                    )}
                                  </div>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={handleEditPrice}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-[#F97316] font-semibold border-2 border-[#F97316]/30 hover:bg-[#F97316] hover:text-white luxury-transition-fast shadow-md hover:shadow-lg"
                          >
                            Modifier le prix
                          </button>
                        )}
                              </div>
                              {/* UPDATED: Total Price Calculation - Only show when quantity > 1 */}
                              {filterData.price && quantity > 1 && (
                                <div className="pt-3 border-t border-orange-200">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                                    <div className="flex-1">
                                      <p className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1">
                                        Total ({quantity} {quantity === 1 ? 'unité' : 'unités'})
                                      </p>
                                      <div className="flex items-baseline gap-2 sm:gap-3">
                                        <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-orange-600">
                                          {calculateTotalPrice(filterData.price, quantity)}
                                        </span>
                                        <span className="text-sm sm:text-base font-semibold text-gray-700">TND</span>
                                      </div>
                                    </div>
                                    <div className="text-right sm:text-left">
                                      <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                        {(() => {
                                          const unitPrice = parseFloat(filterData.price) || 0;
                                          const unitPriceFixed = unitPrice.toFixed(2);
                                          const totalFixed = calculateTotalPrice(filterData.price, quantity);
                                          return `${unitPriceFixed} TND × ${quantity} = ${totalFixed} TND`;
                                        })()}
                                      </p>
                                    </div>
                                  </div>
                      </div>
                    )}
                  </div>
              )}
                        </div>
              
                        {/* UPDATED: Modèle & Motorisation Selection */}
                        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 space-y-3 sm:space-y-4">
                {/* Modèle Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="modele-select" className="block text-xs sm:text-sm font-semibold text-gray-700">
                      Modèle
                    </label>
                    {isAdmin && (
                      <button
                        onClick={() => setShowAddModele(!showAddModele)}
                        className="text-[10px] sm:text-xs bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-2 py-1 rounded flex items-center gap-1 touch-manipulation"
                      >
                        <span>+</span> Ajouter
                      </button>
                    )}
                  </div>
                  <select
                    id="modele-select"
                    value={selectedModele}
                    onChange={(e) => setSelectedModele(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un modèle</option>
                    {modeles.map((modele, index) => (
                      <option key={index} value={modele}>
                        {modele}
                      </option>
                    ))}
                  </select>
                  
                  {/* Admin Management for Modèles */}
                  {isAdmin && (
                    <div className="mt-3 space-y-2">
                      {modeles.map((modele, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                          {editingModeleIndex === index ? (
                            <>
                              <Input
                                type="text"
                                value={editModeleValue}
                                onChange={(e) => setEditModeleValue(e.target.value)}
                                className="flex-1"
                              />
                              <button
                                onClick={handleSaveEditModele}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingModeleIndex(null);
                                  setEditModeleValue('');
                                }}
                                className="px-2 py-1 bg-gray-500 text-white rounded text-xs"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm">{modele}</span>
                              <button
                                onClick={() => handleEditModele(index)}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteModele(index)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                      
                      {/* Add New Modèle Form */}
                      {showAddModele && (
                        <div className="flex items-center gap-2 bg-white p-2 rounded border">
                          <Input
                            type="text"
                            value={newModele}
                            onChange={(e) => setNewModele(e.target.value)}
                            placeholder="Nouveau modèle"
                            className="flex-1"
                          />
                          <button
                            onClick={handleAddModele}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              setShowAddModele(false);
                              setNewModele('');
                            }}
                            className="px-2 py-1 bg-gray-500 text-white rounded text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Motorisation Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="motorisation-select" className="block text-xs sm:text-sm font-semibold text-gray-700">
                      Motorisation
                    </label>
                    {isAdmin && (
                      <button
                        onClick={() => setShowAddMotorisation(!showAddMotorisation)}
                        className="text-[10px] sm:text-xs bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-2 py-1 rounded flex items-center gap-1 touch-manipulation"
                      >
                        <span>+</span> Ajouter
                      </button>
                    )}
                  </div>
                  <select
                    id="motorisation-select"
                    value={selectedMotorisation}
                    onChange={(e) => setSelectedMotorisation(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une motorisation</option>
                    {motorisations.map((motorisation, index) => (
                      <option key={index} value={motorisation}>
                        {motorisation}
                      </option>
                    ))}
                  </select>
                  
                  {/* Admin Management for Motorisations */}
                  {isAdmin && (
                    <div className="mt-3 space-y-2">
                      {motorisations.map((motorisation, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border">
                          {editingMotorisationIndex === index ? (
                            <>
                              <Input
                                type="text"
                                value={editMotorisationValue}
                                onChange={(e) => setEditMotorisationValue(e.target.value)}
                                className="flex-1"
                              />
                              <button
                                onClick={handleSaveEditMotorisation}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMotorisationIndex(null);
                                  setEditMotorisationValue('');
                                }}
                                className="px-2 py-1 bg-gray-500 text-white rounded text-xs"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm">{motorisation}</span>
                              <button
                                onClick={() => handleEditMotorisation(index)}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteMotorisation(index)}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                      
                      {/* Add New Motorisation Form */}
                      {showAddMotorisation && (
                        <div className="flex items-center gap-2 bg-white p-2 rounded border">
                          <Input
                            type="text"
                            value={newMotorisation}
                            onChange={(e) => setNewMotorisation(e.target.value)}
                            placeholder="Nouvelle motorisation"
                            className="flex-1"
                          />
                          <button
                            onClick={handleAddMotorisation}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              setShowAddMotorisation(false);
                              setNewMotorisation('');
                            }}
                            className="px-2 py-1 bg-gray-500 text-white rounded text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
                        {/* UPDATED: Quantity Field */}
                        <div>
                          <label htmlFor="quantity-input" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                            Quantité
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition touch-manipulation"
                              aria-label="Diminuer la quantité"
                            >
                              <span className="text-lg sm:text-xl font-bold">−</span>
                            </button>
                            <Input
                              id="quantity-input"
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1;
                                setQuantity(Math.max(1, value));
                              }}
                              className="flex-1 text-center text-base sm:text-lg font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => setQuantity(prev => prev + 1)}
                              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition touch-manipulation"
                              aria-label="Augmenter la quantité"
                            >
                              <span className="text-lg sm:text-xl font-bold">+</span>
                            </button>
                          </div>
                        </div>
              
                        {/* UPDATED: Social Share Buttons */}
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          <button className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-xs sm:text-sm font-semibold hover:bg-blue-100 active:bg-blue-200 transition touch-manipulation flex-1 sm:flex-none min-w-0">
                            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">Partager</span>
                          </button>
                          <button className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-green-50 text-green-600 text-xs sm:text-sm font-semibold hover:bg-green-100 active:bg-green-200 transition touch-manipulation flex-1 sm:flex-none min-w-0">
                            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">WhatsApp</span>
                          </button>
                          <button className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-gray-50 text-gray-600 text-xs sm:text-sm font-semibold hover:bg-gray-100 active:bg-gray-200 transition touch-manipulation flex-1 sm:flex-none min-w-0">
                            <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">Contact</span>
                          </button>
                        </div>

                        {/* Ultra-Luxury CTA Buttons */}
                        <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    const cartItem = {
                      id: filterData.id || Date.now().toString(),
                      name: filterData.name || 'Filtre',
                      price: filterData.price || '0',
                      image: filterData.image || '',
                      description: filterData.description || '',
                      modele: selectedModele || '',
                      motorisation: selectedMotorisation || '',
                                quantity: quantity,
                    };
                    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
                    const existingItemIndex = currentCart.findIndex((item: any) => item.id === cartItem.id);
                              if (existingItemIndex !== -1) {
                                currentCart[existingItemIndex].quantity += quantity;
                              } else {
                                currentCart.push(cartItem);
                              }
                              localStorage.setItem('cart', JSON.stringify(currentCart));
                              window.dispatchEvent(new Event('cartUpdated'));
                              alert(`✅ ${quantity} produit(s) ajouté(s) au panier avec succès!`);
                            }}
                            className="group w-full luxury-gradient-primary text-white font-semibold py-4 px-6 rounded-2xl shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-button-hover)] luxury-transition-fast hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-100 flex items-center justify-center gap-3 text-lg overflow-hidden"
                          >
                            <ShoppingCart className="w-5 h-5 luxury-transition-fast group-hover:scale-110" />
                            <span className="relative z-10">Ajouter au panier</span>
                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full luxury-transition-slower" />
                          </button>
                          <div className="w-full">
                            {!showCommanderQuantity ? (
                              <button 
                                onClick={() => setShowCommanderQuantity(true)}
                                className="group w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg hover:shadow-xl luxury-transition-fast hover:-translate-y-1 hover:scale-[1.02] active:translate-y-0 active:scale-100 flex items-center justify-center gap-3 text-lg overflow-hidden"
                              >
                                <Star className="w-5 h-5 luxury-transition-fast group-hover:scale-110" />
                                <span className="relative z-10">Commander</span>
                              </button>
                            ) : (
                              <div className="bg-white border-2 border-green-500 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4 shadow-lg">
                                <div className="flex items-center justify-between">
                                  <label className="text-sm sm:text-base font-semibold text-gray-700">Quantité</label>
                                  <button
                                    onClick={() => {
                                      setShowCommanderQuantity(false);
                                      setCommanderQuantity(1);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <button
                                    onClick={() => setCommanderQuantity(prev => Math.max(1, prev - 1))}
                                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg sm:rounded-xl font-bold text-lg sm:text-xl text-gray-700 transition-colors touch-manipulation"
                                  >
                                    −
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={commanderQuantity}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 1;
                                      setCommanderQuantity(Math.max(1, val));
                                    }}
                                    className="flex-1 text-center text-lg sm:text-xl font-bold border-2 border-gray-300 rounded-lg sm:rounded-xl py-2 sm:py-3 px-2 focus:outline-none focus:border-green-500"
                                  />
                                  <button
                                    onClick={() => setCommanderQuantity(prev => prev + 1)}
                                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg sm:rounded-xl font-bold text-lg sm:text-xl text-gray-700 transition-colors touch-manipulation"
                                  >
                                    +
                                  </button>
            </div>
                                {filterData.price && (
                                  <div className="pt-2 border-t border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs sm:text-sm text-gray-600">Prix unitaire:</span>
                                      <span className="text-sm sm:text-base font-semibold text-gray-700">
                                        {parseFloat(filterData.price).toFixed(2)} TND
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm sm:text-base font-semibold text-gray-900">Total:</span>
                                      <span className="text-lg sm:text-xl font-bold text-green-600">
                                        {calculateTotalPrice(filterData.price, commanderQuantity)} TND
                                      </span>
          </div>
        </div>
                                )}
                                <button
                                  onClick={() => {
                                    setShowOrderForm(true);
                                    setShowCommanderQuantity(false);
                                  }}
                                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:from-green-700 active:to-green-800 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg active:shadow-md flex items-center justify-center gap-2 sm:gap-3 text-base sm:text-lg touch-manipulation"
                                >
                                  <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                                  Commander ({commanderQuantity} {commanderQuantity === 1 ? 'unité' : 'unités'})
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* UPDATED: Description Section with Tabs */}
                    <div className="pt-6 sm:pt-8 border-t border-gray-100">
                      {renderSectionHeading('DESCRIPTION', 'Détails & compatibilité')}
                      <div className="flex gap-3 sm:gap-6 border-b border-gray-200 mb-3 sm:mb-4 overflow-x-auto scrollbar-hide">
                        {infoTabs.map((tab) => (
                          <button
                            key={tab.key}
                            className={`pb-2 sm:pb-3 text-xs sm:text-sm font-semibold tracking-wide transition whitespace-nowrap touch-manipulation ${
                              activeInfoTab === tab.key
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-gray-400 border-b-2 border-transparent'
                            }`}
                            onClick={() => setActiveInfoTab(tab.key)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                        {tabContentMap[activeInfoTab]}
                      </p>
                    </div>

                    {/* UPDATED: Accessories Section */}
                    <div className="pt-4 sm:pt-6 border-t border-gray-100">
                      {renderSectionHeading('ACCESSOIRES', 'Complétez votre montage')}
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                        {accessoriesProducts.map((product, index) => {
                          const price = product.price ? parseFloat(product.price).toFixed(2) : null;
                          return (
                            <div
                              key={product.id || index}
                              className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 space-y-2 sm:space-y-3 active:shadow-md transition touch-manipulation"
                            >
                              <div className="h-24 sm:h-32 bg-gray-50 rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <Car className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                                )}
                              </div>
                              <p className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2">
                                {product.name || product.title || 'Accessoire'}
                              </p>
                              {price ? (
                                <p className="text-sm sm:text-lg font-bold text-orange-600">{price} TND</p>
                              ) : (
                                <p className="text-xs sm:text-sm text-gray-500">Prix sur demande</p>
                              )}
                              <p className="text-[10px] sm:text-xs text-green-600">
                                {product.availability || 'Disponible'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* UPDATED: Similar Products Section */}
                    <div className="pt-4 sm:pt-6 border-t border-gray-100">
                      {renderSectionHeading('PRODUITS SIMILAIRES', 'Vous aimerez aussi')}
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                        {similarProducts.map((product, index) => {
                          const price = product.price ? parseFloat(product.price).toFixed(2) : null;
                          return (
                            <div
                              key={product.id || index}
                              className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 text-center space-y-2 sm:space-y-3 active:shadow-md transition touch-manipulation"
                            >
                              <div className="h-20 sm:h-28 bg-gray-50 rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <Car className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                                )}
                              </div>
                              <p className="text-xs sm:text-sm font-semibold text-gray-900 line-clamp-2">
                                {product.name || 'Produit'}
                              </p>
                              {price && <p className="text-sm sm:text-base font-bold text-gray-800">{price} TND</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* UPDATED: Autre Produits Section */}
                    <div className="pt-4 sm:pt-6 border-t border-gray-100">
                      {renderSectionHeading('AUTRES PRODUITS', 'Découvrez aussi')}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
                        {otherProducts.map((product, index) => {
                          const price = product.price ? parseFloat(product.price).toFixed(2) : null;
                          return (
                            <div
                              key={product.id || index}
                              className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col active:shadow-md transition touch-manipulation"
                            >
                              <div className="h-32 sm:h-40 bg-gray-50 flex items-center justify-center">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <Car className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                                )}
                              </div>
                              <div className="p-3 sm:p-4 flex flex-col flex-1">
                                <p className="text-sm sm:text-base font-semibold text-gray-900 mb-2 line-clamp-2">
                                  {product.name || 'Produit'}
                                </p>
                                {price ? (
                                  <p className="text-lg sm:text-2xl font-bold text-orange-600 mb-3 sm:mb-4">{price} TND</p>
                                ) : (
                                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">Prix sur demande</p>
                                )}
                                <button
                                  onClick={() => {
                                    const cartItem = {
                                      id: product.id || Date.now().toString(),
                                      name: product.name || 'Produit',
                                      price: product.price || '0',
                                      image: product.image || '',
                                      description: product.description || '',
                                      modele: '',
                                      motorisation: '',
                                      quantity: 1,
                                    };
                                    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
                                    const existingItemIndex = currentCart.findIndex(
                                      (item: any) => item.id === cartItem.id
                                    );
                    if (existingItemIndex !== -1) {
                      currentCart[existingItemIndex].quantity += 1;
                    } else {
                      currentCart.push(cartItem);
                    }
                    localStorage.setItem('cart', JSON.stringify(currentCart));
                    window.dispatchEvent(new Event('cartUpdated'));
                    alert('✅ Produit ajouté au panier avec succès!');
                  }}
                                  className="mt-auto w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs sm:text-sm font-semibold py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition touch-manipulation"
                >
                  Ajouter au panier
                </button>
              </div>
                            </div>
                          );
                        })}
            </div>
          </div>
        </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Best Sellers - Displaying Other Filters */}
      {allFilters.length > 0 && (
        <div className="bg-white p-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">LES MEILLEURES VENTES</h3>
          <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
            {allFilters.map((filter) => (
              <Card key={filter.id || filter.url} className="flex-shrink-0 w-64">
                <CardContent className="p-4">
                  <div className="text-center mb-3">
                    {filter.name && (
                      <div className="text-red-600 font-bold text-sm mb-2">{filter.name}</div>
                    )}
                    {filter.image && filter.image.trim() ? (
                      <img
                        src={filter.image}
                        alt={filter.name || 'Filter'}
                        className="w-full h-24 object-contain mx-auto mb-2"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 flex items-center justify-center mb-2 rounded">
                        <Car className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <h4 className="font-bold text-gray-800 mb-1">{filter.name || 'Filtre'}</h4>
                    {filter.price ? (
                      <div className="text-lg font-bold text-orange-500 mb-2">
                        {parseFloat(filter.price).toFixed(2)} TND
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-gray-400 mb-2">Prix sur demande</div>
                    )}
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                      <span className="text-green-500 text-sm">✓</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const cartItem = {
                          id: filter.id || Date.now().toString(),
                          name: filter.name || 'Filtre',
                          price: filter.price || '0',
                          image: filter.image || '',
                          description: filter.description || '',
                          modele: '',
                          motorisation: '',
                          quantity: 1
                        };
                        
                        // Get current cart from localStorage
                        const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
                        
                        // Check if item already exists in cart
                        const existingItemIndex = currentCart.findIndex((item: any) => item.id === cartItem.id);
                        
                        if (existingItemIndex !== -1) {
                          // If exists, increase quantity
                          currentCart[existingItemIndex].quantity += 1;
                        } else {
                          // If not exists, add new item
                          currentCart.push(cartItem);
                        }
                        
                        // Save to localStorage
                        localStorage.setItem('cart', JSON.stringify(currentCart));
                        
                        // Dispatch event to update cart count
                        window.dispatchEvent(new Event('cartUpdated'));
                        
                        // Show success message
                        alert('✅ Produit ajouté au panier avec succès!');
                      }}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 mb-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Ajouter au panier
                    </button>
                    {filter.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{filter.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Parts Catalog - Redesigned for Large Screens Only */}
      {!filterId && (
        <section className="relative bg-white py-12 lg:py-16 xl:py-20 overflow-hidden">
          {/* ✅ Decorative Watermark - rannenautomotors (Large Screens Only) */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-[-12deg]"
              style={{
                fontSize: 'clamp(10rem, 25vw, 22rem)',
                fontWeight: 900,
                color: 'rgba(0, 0, 0, 0.2)',
                letterSpacing: '0.8rem',
                whiteSpace: 'nowrap',
                fontFamily: 'Arial, sans-serif',
                textTransform: 'uppercase',
                userSelect: 'none',
                textShadow: '0 0 30px rgba(0, 0, 0, 0.1)'
              }}
            >
              rannenautomotors
            </div>
          </div>

          <div className="relative z-10 max-w-[1400px] xl:max-w-[1600px] mx-auto px-8 lg:px-12 xl:px-20 2xl:px-24">
            {/* Title - Large and Bold */}
            <h2 className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-black mb-8 lg:mb-12 xl:mb-16 text-center lg:text-left uppercase tracking-tight">
              CATALOGUE DE PIÈCES DÉTACHÉES
            </h2>
            
            {/* Categories Grid - Only visible on large screens */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-6 xl:gap-8 2xl:gap-10">
              {partCategories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-2xl xl:rounded-3xl p-6 xl:p-8 2xl:p-10 
                               border border-gray-200 hover:border-gray-300
                               cursor-pointer transition-all duration-300 
                               hover:shadow-lg hover:scale-105
                               flex flex-col items-center justify-center
                               aspect-square"
                    onClick={() => handleFilterClick(category)}
                  >
                    {/* Black Line-Art Icon */}
                    <IconComponent 
                      className="w-16 h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24 
                                 text-black mb-4 xl:mb-6 2xl:mb-8
                                 stroke-[1.5]"
                    />
                    {/* Category Name */}
                    <p className="text-sm xl:text-base 2xl:text-lg font-medium text-black text-center">
                      {category.name}
                    </p>
                  </div>
                );
              })}
            </div>
            
            {/* Mobile/Tablet View - Keep original design */}
            <div className="lg:hidden bg-white p-4 mb-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">CATALOGUE DE PIÈCES DÉTACHÉES - RECHERCHE PAR CATÉGORIE</h3>
              <div className="grid grid-cols-3 gap-4">
                {partCategories.map((category, index) => {
                  const IconComponent = category.icon;
                  return (
                    <div
                      key={index}
                      className="text-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => handleFilterClick(category)}
                    >
                      <IconComponent className="w-8 h-8 mx-auto mb-2 text-black" />
                      <p className="text-xs font-medium text-gray-700">{category.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Menu Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="text-orange-500 text-xl font-bold">Menu</SheetTitle>
            <SheetDescription>
              Navigation principale du site
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-4">
            {/* Navigation Links */}
            <div className="space-y-2">
              <Link 
                to="/" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <Home className="w-5 h-5 text-orange-500" />
                <span className="font-medium">Accueil</span>
              </Link>
              
              <Link 
                to="/products" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <ShoppingCart className="w-5 h-5 text-orange-500" />
                <span className="font-medium">Produits</span>
              </Link>
              
              <Link 
                to="/cart" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <ShoppingCart className="w-5 h-5 text-orange-500" />
                <span className="font-medium">Mon Panier</span>
              </Link>
              
              <Link 
                to="/favorites" 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <Heart className="w-5 h-5 text-orange-500" />
                <span className="font-medium">Mes Favoris</span>
              </Link>
            </div>
            
            {/* User Section */}
            <div className="border-t pt-4">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <User className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Connecté</p>
                      <p className="text-sm text-green-600">{user.username}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      handleLogout();
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors w-full"
                  >
                    <LogOut className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-red-600">Se déconnecter</span>
                  </button>
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">Se connecter</span>
                </Link>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirmer la suppression</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Oui, supprimer
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Manager Modal (Admin Only) */}
      {showImageManager && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Gérer les images du produit</h2>
              <button
                onClick={() => {
                  setShowImageManager(false);
                  setEditingImageIndex(null);
                  setNewImagePreview('');
                  setNewImageFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Current Images Grid */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Images actuelles ({productImages.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {productImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={image}
                        alt={`Image ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setEditingImageIndex(index)}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-lg"
                        title="Remplacer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteImage(index)}
                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add/Replace Image Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {editingImageIndex !== null ? `Remplacer l'image #${editingImageIndex + 1}` : 'Ajouter une nouvelle image'}
              </h3>
              
              <div className="space-y-4">
                {/* File Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choisir une image
                  </label>
                  <label className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer transition-colors">
                    <Upload className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      {newImageFile ? newImageFile.name : 'Cliquez pour sélectionner une image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Image Preview */}
                {newImagePreview && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aperçu
                    </label>
                    <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                      <img
                        src={newImagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {editingImageIndex !== null ? (
                    <>
                      <button
                        onClick={() => handleReplaceImage(editingImageIndex)}
                        className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                        disabled={!newImagePreview}
                      >
                        Remplacer l'image
                      </button>
                      <button
                        onClick={() => {
                          setEditingImageIndex(null);
                          setNewImagePreview('');
                          setNewImageFile(null);
                        }}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleAddImage}
                      className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                      disabled={!newImagePreview}
                    >
                      Ajouter l'image
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Conseil:</strong> Vous pouvez ajouter jusqu'à 10 images. Les images seront affichées dans un carrousel sur la page du produit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Passer une commande</h2>
              <button
                onClick={() => {
                  setShowOrderForm(false);
                  setShowCommanderQuantity(false);
                  setCommanderQuantity(1);
                  setOrderData({ phone: '', firstName: '', lastName: '', governorate: '' });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Product Info Summary */}
            {filterData && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-900 mb-2">{filterData.name}</h3>
                {filterData.price && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-700">Prix unitaire:</span>
                      <span className="text-orange-700 font-semibold">{parseFloat(filterData.price).toFixed(2)} TND</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-orange-700">Quantité:</span>
                      <span className="text-orange-700 font-semibold">{commanderQuantity} {commanderQuantity === 1 ? 'unité' : 'unités'}</span>
                    </div>
                    <div className="pt-2 border-t border-orange-300 flex items-center justify-between">
                      <span className="text-base font-semibold text-orange-900">Total:</span>
                      <span className="text-lg font-bold text-orange-900">{calculateTotalPrice(filterData.price, commanderQuantity)} TND</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4 sm:space-y-5">
              {/* Phone Number */}
              <div className="w-full">
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Numéro de téléphone <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  value={orderData.phone}
                  onChange={(e) => setOrderData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full text-base"
                  placeholder="Ex: 12 345 678"
                  required
                />
              </div>

              {/* First Name */}
              <div className="w-full">
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={orderData.firstName}
                  onChange={(e) => setOrderData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full text-base"
                  placeholder="Votre prénom"
                  required
                />
              </div>

              {/* Last Name */}
              <div className="w-full">
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Nom <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={orderData.lastName}
                  onChange={(e) => setOrderData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full text-base"
                  placeholder="Votre nom"
                  required
                />
              </div>

              {/* Governorate */}
              <div className="w-full">
                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                  Gouvernorat <span className="text-red-500">*</span>
                </label>
                <select
                  value={orderData.governorate}
                  onChange={(e) => setOrderData(prev => ({ ...prev, governorate: e.target.value }))}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Sélectionner un gouvernorat</option>
                  <option value="Tunis">Tunis</option>
                  <option value="Ariana">Ariana</option>
                  <option value="Ben Arous">Ben Arous</option>
                  <option value="Manouba">Manouba</option>
                  <option value="Nabeul">Nabeul</option>
                  <option value="Zaghouan">Zaghouan</option>
                  <option value="Bizerte">Bizerte</option>
                  <option value="Béja">Béja</option>
                  <option value="Jendouba">Jendouba</option>
                  <option value="Kef">Kef</option>
                  <option value="Siliana">Siliana</option>
                  <option value="Sousse">Sousse</option>
                  <option value="Monastir">Monastir</option>
                  <option value="Mahdia">Mahdia</option>
                  <option value="Sfax">Sfax</option>
                  <option value="Kairouan">Kairouan</option>
                  <option value="Kasserine">Kasserine</option>
                  <option value="Sidi Bouzid">Sidi Bouzid</option>
                  <option value="Gabès">Gabès</option>
                  <option value="Medenine">Medenine</option>
                  <option value="Tataouine">Tataouine</option>
                  <option value="Gafsa">Gafsa</option>
                  <option value="Tozeur">Tozeur</option>
                  <option value="Kebili">Kebili</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmitOrder}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Star className="w-5 h-5" />
                  Confirmer la commande
                </button>
                <button
                  onClick={() => {
                    setShowOrderForm(false);
                    setShowCommanderQuantity(false);
                    setCommanderQuantity(1);
                    setOrderData({ phone: '', firstName: '', lastName: '', governorate: '' });
                  }}
                  className="px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                📱 Votre commande sera envoyée via WhatsApp pour confirmation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🏷️ Brands Section - قسم الماركات */}
      {/* 
        ✅ Brands Section احترافي:
        - Grid من شعارات الماركات في صفوف متناسقة
        - بطاقات بيضاء مع ظل خفيف
        - زوايا دائرية (rounded-2xl)
        - max-width: 1400px
        - gap-10 على PC
      */}
      {!filterId && (
        <section className="relative py-12 lg:py-20 xl:py-24 2xl:py-28 bg-white overflow-hidden">
          {/* ✅ Decorative Watermark - rannenautomotors (Large Screens Only) */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-[-12deg]"
              style={{
                fontSize: 'clamp(10rem, 25vw, 22rem)',
                fontWeight: 900,
                color: 'rgba(0, 0, 0, 0.2)',
                letterSpacing: '0.8rem',
                whiteSpace: 'nowrap',
                fontFamily: 'Arial, sans-serif',
                textTransform: 'uppercase',
                userSelect: 'none',
                textShadow: '0 0 30px rgba(0, 0, 0, 0.1)'
              }}
            >
              rannenautomotors
            </div>
          </div>

          <div className="relative z-10 max-w-[1400px] xl:max-w-[1600px] mx-auto px-8 lg:px-12 xl:px-20 2xl:px-24">
            <h2 className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-gray-800 text-center mb-8 lg:mb-12 xl:mb-16 2xl:mb-20" style={{ fontSize: 'clamp(2rem, 4vw + 0.5rem, 4.5rem)' }}>
              Nos Marques Partenaires
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6 gap-6 lg:gap-10 xl:gap-12 2xl:gap-16">
              {['RENAULT', 'PEUGEOT', 'VW', 'CITROËN', 'BMW', 'AUDI', 'MERCEDES', 'FORD', 'OPEL', 'FIAT', 'KIA', 'HYUNDAI'].map((brand) => (
                <div
                  key={brand}
                  className="bg-white rounded-2xl xl:rounded-3xl p-6 lg:p-8 xl:p-10 2xl:p-12 flex items-center justify-center hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-orange-500/50 hover:scale-110 hover:-translate-y-1"
                >
                  <span className="text-sm lg:text-base xl:text-lg 2xl:text-xl font-bold text-gray-700" style={{ fontSize: 'clamp(0.875rem, 1.2vw + 0.25rem, 1.5rem)' }}>{brand}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 🛍️ Products Section - قسم المنتجات */}
      {/* 
        ✅ Products Section احترافي:
        - Grid من 3-4 أعمدة على PC وعمودين على الهاتف
        - بطاقات بيضاء مع ظل خفيف (shadow-md)
        - زوايا دائرية (rounded-2xl)
        - max-width: 1400px
        - gap-10 على PC
      */}
      {!filterId && allFilters.length > 0 && (
        <section className="relative py-12 lg:py-20 xl:py-24 2xl:py-28 bg-gray-50 overflow-hidden">
          {/* ✅ Decorative Watermark - rannenautomotors (Large Screens Only) */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-[-12deg]"
              style={{
                fontSize: 'clamp(10rem, 25vw, 22rem)',
                fontWeight: 900,
                color: 'rgba(0, 0, 0, 0.2)',
                letterSpacing: '0.8rem',
                whiteSpace: 'nowrap',
                fontFamily: 'Arial, sans-serif',
                textTransform: 'uppercase',
                userSelect: 'none',
                textShadow: '0 0 30px rgba(0, 0, 0, 0.1)'
              }}
            >
              rannenautomotors
            </div>
          </div>

          <div className="relative z-10 max-w-[1400px] xl:max-w-[1600px] mx-auto px-8 lg:px-12 xl:px-20 2xl:px-24">
            <h2 className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-gray-800 text-center mb-8 lg:mb-12 xl:mb-16 2xl:mb-20" style={{ fontSize: 'clamp(2rem, 4vw + 0.5rem, 4.5rem)' }}>
              Nos Meilleures Ventes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-6 lg:gap-10 xl:gap-12 2xl:gap-16">
              {allFilters.slice(0, 8).map((filter) => (
                <Card key={filter.id || filter.url} className="bg-white rounded-2xl xl:rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:-translate-y-2 border-0">
                  <CardContent className="p-0">
                    {/* Product Image */}
                    <div className="w-full h-48 lg:h-56 xl:h-64 2xl:h-72 bg-gray-100 flex items-center justify-center overflow-hidden">
                      {filter.image && filter.image.trim() ? (
                        <img
                          src={filter.image}
                          alt={filter.name || 'Product'}
                          className="w-full h-full object-contain transition-transform duration-300 hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Car className="w-16 h-16 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-4 lg:p-6 xl:p-8 2xl:p-10">
                      <h4 className="font-bold text-gray-800 mb-2 text-base lg:text-lg xl:text-xl 2xl:text-2xl" style={{ fontSize: 'clamp(1rem, 1.5vw + 0.25rem, 1.75rem)' }}>{filter.name || 'Filtre'}</h4>
                      
                      {/* Price */}
                      {filter.price ? (
                        <div className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold mb-4" style={{ color: '#ff6600', fontSize: 'clamp(1.5rem, 2.5vw + 0.5rem, 3rem)' }}>
                          {parseFloat(filter.price).toFixed(2)} TND
                        </div>
                      ) : (
                        <div className="text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-400 mb-4" style={{ fontSize: 'clamp(1.125rem, 1.5vw + 0.25rem, 1.5rem)' }}>Prix sur demande</div>
                      )}
                      
                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-4 xl:mb-6">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 xl:h-5 xl:w-5 2xl:h-6 2xl:w-6 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      
                      {/* Commander Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const cartItem = {
                            id: filter.id || Date.now().toString(),
                            name: filter.name || 'Filtre',
                            price: filter.price || '0',
                            image: filter.image || '',
                            description: filter.description || '',
                            modele: '',
                            motorisation: '',
                            quantity: 1
                          };
                          
                          const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
                          const existingItemIndex = currentCart.findIndex((item: any) => item.id === cartItem.id);
                          
                          if (existingItemIndex !== -1) {
                            currentCart[existingItemIndex].quantity += 1;
                          } else {
                            currentCart.push(cartItem);
                          }
                          
                          localStorage.setItem('cart', JSON.stringify(currentCart));
                          window.dispatchEvent(new Event('cartUpdated'));
                          alert('✅ Produit ajouté au panier avec succès!');
                        }}
                        className="w-full text-white font-semibold py-3 xl:py-4 2xl:py-5 rounded-lg transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105"
                        style={{ backgroundColor: '#ff6600', fontSize: 'clamp(0.875rem, 1.2vw + 0.25rem, 1.25rem)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e55a00'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff6600'}
                      >
                        Commander
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default FilterPage;

