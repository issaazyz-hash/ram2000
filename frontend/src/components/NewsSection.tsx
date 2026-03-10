import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import workshopImage from "@/assets/workshop.jpg";
import brakeImage from "@/assets/brake-parts.jpg";

const NewsSection = () => {
  const [user, setUser] = useState<any>(null);
  const [newsImages, setNewsImages] = useState<{[key: number]: string}>({});
  const [newsTexts, setNewsTexts] = useState<{[key: number]: {title: string, description: string, date: string}}>({});
  const [sectionTitle, setSectionTitle] = useState("Huiles Auto & Eau radiateur");
  const [imageTransforms, setImageTransforms] = useState<{[key: number]: {width: number, height: number, scale: number, translateX: number, translateY: number}}>({});

  const defaultArticles = [
    {
      title: "Entretien Automobile",
      description: "Conseils pour maintenir votre véhicule en parfait état",
      image: workshopImage,
      date: "15 Mars 2024"
    },
    {
      title: "Les Nouveautés en Pièces Auto",
      description: "Découvrez les dernières innovations en équipements automobiles",
      image: brakeImage,
      date: "10 Mars 2024"
    }
  ];

  // Load user and saved data
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    const savedImages = localStorage.getItem('newsImages');
    if (savedImages) {
      setNewsImages(JSON.parse(savedImages));
    }

    const savedTexts = localStorage.getItem('newsTexts');
    if (savedTexts) {
      setNewsTexts(JSON.parse(savedTexts));
    }

    const savedTitle = localStorage.getItem('newsSectionTitle');
    if (savedTitle) {
      setSectionTitle(savedTitle);
    }

    const savedTransforms = localStorage.getItem('newsImageTransforms');
    if (savedTransforms) {
      setImageTransforms(JSON.parse(savedTransforms));
    }
  }, []);

  const handleImageUpload = (articleIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImages = {
          ...newsImages,
          [articleIndex]: e.target?.result as string
        };
        setNewsImages(newImages);
        localStorage.setItem('newsImages', JSON.stringify(newImages));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (articleIndex: number) => {
    const newImages = { ...newsImages };
    delete newImages[articleIndex];
    setNewsImages(newImages);
    localStorage.setItem('newsImages', JSON.stringify(newImages));
  };

  const handleTextChange = (articleIndex: number, field: string, value: string) => {
    const currentTexts = newsTexts[articleIndex] || {};
    const newTexts = {
      ...newsTexts,
      [articleIndex]: {
        ...currentTexts,
        [field]: value
      }
    };
    setNewsTexts(newTexts);
    localStorage.setItem('newsTexts', JSON.stringify(newTexts));
  };

  const resetTexts = (articleIndex: number) => {
    const newTexts = { ...newsTexts };
    delete newTexts[articleIndex];
    setNewsTexts(newTexts);
    localStorage.setItem('newsTexts', JSON.stringify(newTexts));
  };

  const handleTitleChange = (value: string) => {
    setSectionTitle(value);
    localStorage.setItem('newsSectionTitle', value);
  };

  const resetTitle = () => {
    setSectionTitle("Huiles Auto & Eau radiateur");
    localStorage.setItem('newsSectionTitle', "Huiles Auto & Eau radiateur");
  };

  const handleImageTransform = (articleIndex: number, field: string, value: number) => {
    const currentTransform = imageTransforms[articleIndex] || { width: 100, height: 100, scale: 1, translateX: 0, translateY: 0 };
    const newTransform = {
      ...currentTransform,
      [field]: value
    };
    const newTransforms = {
      ...imageTransforms,
      [articleIndex]: newTransform
    };
    setImageTransforms(newTransforms);
    localStorage.setItem('newsImageTransforms', JSON.stringify(newTransforms));
  };

  const resetImageTransform = (articleIndex: number) => {
    const newTransforms = { ...imageTransforms };
    delete newTransforms[articleIndex];
    setImageTransforms(newTransforms);
    localStorage.setItem('newsImageTransforms', JSON.stringify(newTransforms));
  };

  return (
    <section className="py-responsive bg-automotive-light-gray">
      <div className="container-responsive">
        {/* Section Title */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          {user && user.role === 'admin' ? (
            <div className="mobile-stack items-center justify-center">
              <Input
                value={sectionTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-responsive-lg font-bold text-center text-orange-500 bg-transparent border-orange-500 mobile-input"
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
          ) : (
            <h2 className="text-responsive-lg font-bold text-orange-500">{sectionTitle}</h2>
          )}
        </div>
        
        <div className="mobile-grid lg:grid-cols-2 gap-responsive mb-6 sm:mb-8">
          {defaultArticles.map((article, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow rounded-responsive">
              <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden bg-orange-500">
                <img 
                  src={newsImages[index] || article.image} 
                  alt={newsTexts[index]?.title || article.title}
                  className="w-full h-full object-cover"
                  style={{
                    width: imageTransforms[index]?.width ? `${imageTransforms[index].width}%` : '100%',
                    height: imageTransforms[index]?.height ? `${imageTransforms[index].height}%` : '100%',
                    transform: `scale(${imageTransforms[index]?.scale || 1}) translate(${imageTransforms[index]?.translateX || 0}px, ${imageTransforms[index]?.translateY || 0}px)`,
                    objectFit: 'cover'
                  }}
                />
                {user && user.role === 'admin' && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(index, e)}
                      className="hidden"
                      id={`image-upload-${index}`}
                    />
                    <label
                      htmlFor={`image-upload-${index}`}
                      className="bg-orange-500 hover:bg-orange-600 text-white p-1 rounded cursor-pointer"
                      title="Changer l'image"
                    >
                      <Upload className="h-3 w-3" />
                    </label>
                    {newsImages[index] && (
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="bg-red-500 hover:bg-red-600 text-white p-1 rounded"
                        title="Supprimer l'image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
                
              </div>
              <CardHeader className="mobile-card">
                {user && user.role === 'admin' ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        value={newsTexts[index]?.title || article.title}
                        onChange={(e) => handleTextChange(index, 'title', e.target.value)}
                        className="text-responsive-lg font-bold bg-transparent border-orange-500 mobile-input"
                        placeholder="Titre de l'article"
                      />
                      {(newsTexts[index]?.title !== undefined ? newsTexts[index].title : article.title) && (
                        <button
                          type="button"
                          onClick={() => handleTextChange(index, 'title', '')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 text-sm mobile-tap"
                          title="Effacer le titre"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        value={newsTexts[index]?.date || article.date}
                        onChange={(e) => handleTextChange(index, 'date', e.target.value)}
                        className="text-responsive-sm text-muted-foreground bg-transparent border-gray-300 mobile-input"
                        placeholder="Date"
                      />
                      {(newsTexts[index]?.date !== undefined ? newsTexts[index].date : article.date) && (
                        <button
                          type="button"
                          onClick={() => handleTextChange(index, 'date', '')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 text-sm mobile-tap"
                          title="Effacer la date"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <Button
                      onClick={() => resetTexts(index)}
                      variant="outline"
                      size="sm"
                      className="mobile-button text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-responsive-lg">{newsTexts[index]?.title || article.title}</CardTitle>
                    <p className="text-responsive-sm text-muted-foreground">{newsTexts[index]?.date || article.date}</p>
                  </>
                )}
              </CardHeader>
              <CardContent className="mobile-card pt-0">
                {user && user.role === 'admin' ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <Textarea
                        value={newsTexts[index]?.description || article.description}
                        onChange={(e) => handleTextChange(index, 'description', e.target.value)}
                        className="text-responsive-sm text-muted-foreground bg-transparent border-gray-300 min-h-[60px] mobile-input"
                        placeholder="Description de l'article"
                      />
                      {(newsTexts[index]?.description !== undefined ? newsTexts[index].description : article.description) && (
                        <button
                          type="button"
                          onClick={() => handleTextChange(index, 'description', '')}
                          className="absolute right-2 top-2 text-gray-400 hover:text-red-500 text-sm mobile-tap"
                          title="Effacer la description"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-responsive-sm text-muted-foreground mb-3 sm:mb-4">{newsTexts[index]?.description || article.description}</p>
                )}
                {/* Removed: Link to /catalogue - catalogue page deleted */}
                {false && index === 0 ? (
                  <Link to="/catalogue">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mobile-button mt-3 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors duration-200"
                    >
                      Lire la suite
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mobile-button mt-3 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors duration-200"
                  >
                    Lire la suite
                  </Button>
                )}
              </CardContent>
              
              {/* Image Controls for Admin - Moved to separate section */}
              {user && user.role === 'admin' && (newsImages[index] || article.image) && (
                <div className="p-4 bg-gray-50 border-t">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Contrôles d'image</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Largeur (%)</label>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={imageTransforms[index]?.width || 100}
                        onChange={(e) => handleImageTransform(index, 'width', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>50%</span>
                        <span className="font-semibold text-orange-500">{imageTransforms[index]?.width || 100}%</span>
                        <span>150%</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Hauteur (%)</label>
                      <input
                        type="range"
                        min="50"
                        max="150"
                        value={imageTransforms[index]?.height || 100}
                        onChange={(e) => handleImageTransform(index, 'height', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>50%</span>
                        <span className="font-semibold text-orange-500">{imageTransforms[index]?.height || 100}%</span>
                        <span>150%</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Échelle</label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={imageTransforms[index]?.scale || 1}
                        onChange={(e) => handleImageTransform(index, 'scale', parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>0.5x</span>
                        <span className="font-semibold text-orange-500">{(imageTransforms[index]?.scale || 1).toFixed(1)}x</span>
                        <span>2.0x</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Position X (px)</label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={imageTransforms[index]?.translateX || 0}
                        onChange={(e) => handleImageTransform(index, 'translateX', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>-50px</span>
                        <span className="font-semibold text-orange-500">{imageTransforms[index]?.translateX || 0}px</span>
                        <span>50px</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Position Y (px)</label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={imageTransforms[index]?.translateY || 0}
                        onChange={(e) => handleImageTransform(index, 'translateY', parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>-50px</span>
                        <span className="font-semibold text-orange-500">{imageTransforms[index]?.translateY || 0}px</span>
                        <span>50px</span>
                      </div>
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={() => resetImageTransform(index)}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm w-full flex items-center justify-center"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset Image
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
        
        <div className="text-center">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white mobile-button">
            VOIR TOUTES NOS ACTUALITÉS
          </Button>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;