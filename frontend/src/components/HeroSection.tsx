import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { X, Upload, Loader2, Check, AlertCircle } from "lucide-react";
import { 
  getHeroContent, 
  updateHeroContent, 
  HeroContentData 
} from "@/api/database";

const HeroSection = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Hero content state (from database)
  const [heroContent, setHeroContent] = useState<HeroContentData>({
    title: "Un large choix de pièces auto",
    subtitle: "Découvrez des milliers de références pour toutes les marques populaires. Qualité garantie, service fiable.",
    buttonText: "Découvrir le catalogue",
    buttonLink: "/huile",
    images: ["/k.png", "/k2.jpg", "/k3.png"]
  });
  
  // Edit form state
  const [editForm, setEditForm] = useState<HeroContentData>({
    title: "",
    subtitle: "",
    buttonText: "",
    buttonLink: "",
    images: []
  });
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImagesEditor, setShowImagesEditor] = useState(false);
  
  // Image upload state
  const [uploadingImages, setUploadingImages] = useState<(File | null)[]>([null, null, null]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Check admin status
  useEffect(() => {
    const normalizeRole = (val: unknown): string | null => {
      if (!val) return null;
      if (typeof val === "string") return val.toLowerCase();
      return null;
    };
    
    const computeIsAdmin = (): boolean => {
      const roleCandidates: Array<string | null> = [];
      let flagAdmin = false;
      
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed?.is_admin === true || parsed?.isAdmin === true || parsed?.is_admin === "true" || parsed?.isAdmin === "true") {
            flagAdmin = true;
          }
          roleCandidates.push(
            normalizeRole(parsed?.role),
            normalizeRole(parsed?.user?.role),
            normalizeRole(parsed?.data?.role)
          );
        } catch {}
      }
      
      const altAuth = localStorage.getItem("auth");
      if (altAuth) {
        try {
          const parsed = JSON.parse(altAuth);
          if (parsed?.is_admin === true || parsed?.isAdmin === true) {
            flagAdmin = true;
          }
          roleCandidates.push(normalizeRole(parsed?.role));
        } catch {}
      }
      
      const plainRole = normalizeRole(localStorage.getItem("role"));
      if (plainRole) roleCandidates.push(plainRole);
      
      roleCandidates.push(
        normalizeRole(localStorage.getItem("userRole")),
        normalizeRole(sessionStorage.getItem("userRole"))
      );
      
      const params = new URLSearchParams(window.location.search);
      const forced =
        localStorage.getItem("force_admin") === "1" ||
        localStorage.getItem("isAdmin") === "1" ||
        localStorage.getItem("isAdmin") === "true" ||
        localStorage.getItem("is_admin") === "1" ||
        localStorage.getItem("is_admin") === "true" ||
        params.get("admin") === "1";
        
      const resolvedRole = roleCandidates.find((r) => !!r) || null;
      const adminSynonyms = ["admin", "administrator", "superadmin", "super admin", "administrateur", "مدير"];
      const adminLike = resolvedRole ? adminSynonyms.includes(resolvedRole) : false;
      
      return forced || flagAdmin || adminLike;
    };
    
    const apply = () => setIsAdmin(computeIsAdmin());
    apply();
    
    window.addEventListener("storage", apply);
    document.addEventListener("visibilitychange", apply);
    
    const t0 = setTimeout(apply, 300);
    const t1 = setTimeout(apply, 1000);
    
    return () => {
      window.removeEventListener("storage", apply);
      document.removeEventListener("visibilitychange", apply);
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, []);

  // Fetch hero content from database
  useEffect(() => {
    const fetchHeroContent = async () => {
      setIsLoading(true);
      try {
        const content = await getHeroContent();
        // Ensure buttonLink always points to /huile
        const updatedContent = {
          ...content,
          buttonLink: "/huile"
        };
        setHeroContent(updatedContent);
        setEditForm(updatedContent);
        setImagePreviews(updatedContent.images || []);
      } catch (error) {
        console.error("Error fetching hero content:", error);
        // Keep default content on error
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHeroContent();
  }, []);

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (heroContent.images.length <= 1) return;
    
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % heroContent.images.length);
        setIsTransitioning(false);
      }, 250);
    }, 4000);

    return () => clearInterval(interval);
  }, [heroContent.images.length]);

  // Handle image file selection
  const handleImageFileChange = (index: number, file: File | undefined) => {
    if (!file) return;
    
    const newFiles = [...uploadingImages];
    newFiles[index] = file;
    setUploadingImages(newFiles);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const newPreviews = [...imagePreviews];
      newPreviews[index] = e.target?.result as string;
      setImagePreviews(newPreviews);
    };
    reader.readAsDataURL(file);
  };

  // Open edit modal
  const handleOpenEditModal = () => {
    setEditForm({ ...heroContent });
    setImagePreviews(heroContent.images || []);
    setUploadingImages([null, null, null]);
    setShowEditModal(true);
    setSaveStatus('idle');
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setShowImagesEditor(false);
    setUploadingImages([null, null, null]);
    setSaveStatus('idle');
  };

  // Save hero content
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      // Prepare images array - use previews which include both existing and new base64 images
      const finalImages = imagePreviews.filter(img => img && img.trim() !== '');
      
      const updateData: Partial<HeroContentData> = {
        title: editForm.title,
        subtitle: editForm.subtitle,
        buttonText: editForm.buttonText,
        buttonLink: editForm.buttonLink,
        images: finalImages.length > 0 ? finalImages : heroContent.images
      };
      
      const updatedContent = await updateHeroContent(updateData);
      
      // Update state with response from server
      setHeroContent(updatedContent);
      setEditForm(updatedContent);
      setImagePreviews(updatedContent.images || []);
      setSaveStatus('success');
      
      // Close modal after success
      setTimeout(() => {
        handleCloseEditModal();
      }, 1000);
      
    } catch (error) {
      console.error("Error saving hero content:", error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle indicator click
  const handleIndicatorClick = (index: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex(index);
      setIsTransitioning(false);
    }, 250);
  };

  return (
    <section className="relative w-full bg-black text-white">
      <div className="relative overflow-hidden">
        {/* Background Image Slider */}
        <div className="h-[320px] sm:h-[380px] md:h-[420px] lg:h-[480px] w-full relative">
          {heroContent.images.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img 
                src={image} 
                alt={`Hero ${index + 1}`}
                className="h-[320px] sm:h-[380px] md:h-[420px] lg:h-[480px] w-full object-cover"
                loading="eager"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ))}
          
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Content */}
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
              {/* Admin Edit Buttons */}
              {isAdmin && (
                <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
                  {/* Text Edit Button */}
                  <button
                    onClick={handleOpenEditModal}
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/70 backdrop-blur-sm ring-1 ring-white/20 hover:ring-orange-500/50 hover:bg-black/80 grid place-items-center text-white shadow-lg transition-all"
                    title="Modifier le texte"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 sm:h-6 sm:w-6">
                      <path d="M21.731 2.269a2.625 2.625 0 0 0-3.714 0l-1.157 1.157 3.714 3.714 1.157-1.157a2.625 2.625 0 0 0 0-3.714zM3 17.25V21h3.75l10.94-10.94-3.714-3.714L3 17.25z"/>
                    </svg>
                  </button>
                  
                  {/* Image Edit Button */}
                  <button
                    onClick={() => {
                      setShowEditModal(true);
                      setShowImagesEditor(true);
                    }}
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/70 backdrop-blur-sm ring-1 ring-white/20 hover:ring-orange-500/50 hover:bg-black/80 grid place-items-center text-white shadow-lg transition-all"
                    title="Modifier les images"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 sm:h-6 sm:w-6">
                      <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}

              <div className="max-w-2xl">
                {/* Loading State */}
                {isLoading ? (
                  <div className="flex items-center gap-2 text-white/70">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Chargement...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold tracking-[0.25em] text-orange-400 uppercase mb-2">
                      Catalogue Ram Auto Motors
                    </p>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3">
                      {heroContent.title}
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg text-gray-100/90 mb-6">
                      {heroContent.subtitle}
                    </p>
                    <Link
                      to={heroContent.buttonLink}
                      className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-semibold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors"
                    >
                      {heroContent.buttonText}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Image Indicators - Hidden on Mobile */}
          <div className="hidden md:flex absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 space-x-2.5 z-20">
            {heroContent.images.map((_, index) => (
              <button
                key={index}
                onClick={() => handleIndicatorClick(index)}
                className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                  index === currentImageIndex 
                    ? 'bg-[#F97316] scale-125 shadow-[0_0_12px_rgba(249,115,22,0.8)]' 
                    : 'bg-white/50 hover:bg-white/70 hover:scale-110'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ==========================================
          ADMIN EDIT MODAL
          ========================================== */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div 
            className="bg-[#1a1f2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="text-lg sm:text-xl font-bold text-white">Modifier le Hero</h2>
              <button
                onClick={handleCloseEditModal}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-5 space-y-5">
              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImagesEditor(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !showImagesEditor 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Texte & Bouton
                </button>
                <button
                  onClick={() => setShowImagesEditor(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showImagesEditor 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  Images
                </button>
              </div>

              {/* Text & Button Editor */}
              {!showImagesEditor && (
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Titre principal</label>
                    <Input 
                      value={editForm.title}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                      placeholder="Titre du hero"
                    />
                  </div>

                  {/* Subtitle */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Sous-titre</label>
                    <Textarea 
                      value={editForm.subtitle}
                      onChange={(e) => setEditForm(prev => ({ ...prev, subtitle: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500 min-h-[100px]"
                      placeholder="Description du hero"
                    />
                  </div>

                  {/* Button Text */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Texte du bouton</label>
                    <Input 
                      value={editForm.buttonText}
                      onChange={(e) => setEditForm(prev => ({ ...prev, buttonText: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                      placeholder="Ex: Découvrir le catalogue"
                    />
                  </div>

                  {/* Button Link */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Lien du bouton</label>
                    <Input 
                      value={editForm.buttonLink}
                      onChange={(e) => setEditForm(prev => ({ ...prev, buttonLink: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white placeholder-gray-500"
                      placeholder="Ex: /catalogue"
                    />
                  </div>
                </div>
              )}

              {/* Images Editor */}
              {showImagesEditor && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Téléchargez jusqu'à 3 images pour le slider du hero. Les images seront affichées en alternance.
                  </p>

                  {[0, 1, 2].map((index) => (
                    <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <label className="block text-sm text-gray-300 mb-3">Image {index + 1}</label>
                      
                      {/* Preview */}
                      {imagePreviews[index] && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                          <img 
                            src={imagePreviews[index]} 
                            alt={`Preview ${index + 1}`} 
                            className="w-full h-32 sm:h-40 object-cover"
                          />
                        </div>
                      )}

                      {/* Upload Input */}
                      <div className="flex gap-2">
                        <input
                          ref={fileInputRefs[index]}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageFileChange(index, e.target.files?.[0])}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRefs[index].current?.click()}
                          className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {imagePreviews[index] ? 'Changer' : 'Télécharger'}
                        </Button>
                        
                        {imagePreviews[index] && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const newPreviews = [...imagePreviews];
                              newPreviews[index] = '';
                              setImagePreviews(newPreviews);
                              const newFiles = [...uploadingImages];
                              newFiles[index] = null;
                              setUploadingImages(newFiles);
                            }}
                            className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Status Messages */}
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400">
                  <Check className="w-5 h-5" />
                  <span>Modifications enregistrées avec succès!</span>
                </div>
              )}
              
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>Erreur lors de l'enregistrement. Veuillez réessayer.</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-white/10 bg-black/20">
              <Button
                variant="outline"
                onClick={handleCloseEditModal}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                disabled={isSaving}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
