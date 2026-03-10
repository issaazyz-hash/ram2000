import { Phone, Mail, MapPin, Clock, Shield, Truck, Users } from "lucide-react";
import { FaFacebook, FaInstagram, FaWhatsapp } from "react-icons/fa";

const Footer = () => {
  const services = [{
    icon: Shield,
    title: "Qualité Originale",
    description: "Pièces certifiées"
  }, {
    icon: Truck,
    title: "Livraison à Domicile",
    description: "Service rapide"
  }, {
    icon: Users,
    title: "Les Meilleurs Prix",
    description: "Prix compétitifs"
  }];

  return (
    <footer>
      {/* ✅ Services Section - Responsive */}
      <section className="luxury-gradient-primary text-white py-4 sm:py-6 md:py-8 lg:py-10">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-center items-stretch gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {services.map((service, index) => {
              const IconComponent = service.icon;
              return (
                <div key={index} className="text-center flex-1 max-w-[120px] sm:max-w-[150px] md:max-w-[200px] lg:max-w-[250px] transition-transform duration-300 hover:scale-105">
                  <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 mx-auto mb-1 sm:mb-2 md:mb-3 transition-transform duration-300 hover:scale-110" />
                  <h3 className="font-semibold text-[10px] sm:text-xs md:text-sm lg:text-base mb-0.5 sm:mb-1 leading-tight">{service.title}</h3>
                  <p className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm opacity-90 leading-tight hidden sm:block">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ✅ Main Footer Section - Responsive Grid */}
      <section className="text-white py-8 sm:py-10 md:py-12 lg:py-16 bg-gradient-to-b from-[#0F1724] to-[#000000] overflow-hidden">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
          {/* Responsive Grid - 1 col mobile, 2 col tablet, 4 col desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10 lg:gap-12 mb-6 sm:mb-8 lg:mb-10">
            
            {/* Column 1: Logo and Info */}
            <div className="flex flex-col items-center sm:items-start gap-3 sm:gap-4 text-center sm:text-left">
                <img 
                  src="/ram.png" 
                  alt="RAM Logo" 
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 object-contain rounded-xl transition-transform duration-300 hover:scale-105"
                />
              <h3 className="text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold leading-tight text-white">
                  Rannen auto motors
                </h3>
              <p className="text-xs sm:text-sm md:text-sm leading-relaxed max-w-[280px] text-white/80">
                Votre spécialiste en pièces détachées et accessoires automobiles depuis plus de 20 ans.
              </p>
            </div>

            {/* Column 2: Navigation Links */}
            <div className="text-center sm:text-left">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-white">
                Navigation
              </h3>
              <ul className="space-y-2 sm:space-y-3">
                <li>
                  <a 
                    href="/" 
                    className="block text-xs sm:text-sm md:text-base text-white/80 hover:text-[#F97316] transition-colors duration-200"
                  >
                    Accueil
                  </a>
                </li>
                <li>
                  <a 
                    href="/products" 
                    className="block text-xs sm:text-sm md:text-base text-white/80 hover:text-[#F97316] transition-colors duration-200"
                  >
                    Catalogue
                  </a>
                </li>
                <li>
                  <a 
                    href="/favorites" 
                    className="block text-xs sm:text-sm md:text-base text-white/80 hover:text-[#F97316] transition-colors duration-200"
                  >
                    Favoris
                  </a>
                </li>
                <li>
                  <a 
                    href="/contact" 
                    className="block text-xs sm:text-sm md:text-base text-white/80 hover:text-[#F97316] transition-colors duration-200"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Contact Info and Social */}
            <div className="text-center sm:text-left">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-white">
                Contactez-Nous
              </h3>
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
                {/* Phone */}
                <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 group">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-[#F97316] group-hover:text-[#ff8f00] transition-colors duration-200" />
                  <span className="text-xs sm:text-sm md:text-base text-white/80 group-hover:text-[#F97316] transition-colors duration-200">
                    +21624 167 004
                  </span>
                </div>
                
                {/* Email */}
                <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 group">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-[#F97316] group-hover:text-[#ff8f00] transition-colors duration-200" />
                  <span className="text-xs sm:text-sm md:text-base text-white/80 break-all group-hover:text-[#F97316] transition-colors duration-200">
                    rannenautomotors@gmail.com
                  </span>
                </div>
                
                {/* Address */}
                <div className="flex items-start justify-center sm:justify-start gap-2 sm:gap-3 group">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0 text-[#F97316] group-hover:text-[#ff8f00] transition-colors duration-200" />
                  <span className="text-xs sm:text-sm md:text-base leading-relaxed text-white/80 group-hover:text-[#F97316] transition-colors duration-200 max-w-[200px] sm:max-w-none">
                    Kairouan, Tunisia
                  </span>
                </div>
              </div>
              
              {/* Social Icons */}
              <div>
                <h4 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 text-white">
                  Suivez-Nous
                </h4>
                <div className="flex justify-center sm:justify-start gap-2 sm:gap-3">
                  {/* Facebook */}
                  <a 
                    href="https://www.facebook.com/share/1JA2Mo6QWx/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-900/60 hover:bg-gray-900/70 flex items-center justify-center transition-all duration-200 hover:scale-105"
                    aria-label="Facebook"
                  >
                    <FaFacebook className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#1877F2' }} />
                  </a>
                  
                  {/* Instagram */}
                  <a 
                    href="https://www.instagram.com/rannenautomotors?igsh=MTZiODFra3JrN3ViNQ==" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-900/60 hover:bg-gray-900/70 flex items-center justify-center transition-all duration-200 hover:scale-105"
                    aria-label="Instagram"
                  >
                    <FaInstagram className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#E4405F' }} />
                  </a>
                  
                  {/* WhatsApp */}
                  <a 
                    href="https://wa.me/21623167813" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-900/60 hover:bg-gray-900/70 flex items-center justify-center transition-all duration-200 hover:scale-105"
                    aria-label="WhatsApp"
                  >
                    <FaWhatsapp className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#25D366' }} />
                  </a>
                </div>
              </div>
            </div>

            {/* Column 4: Google Map - Visible on all screen sizes */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-1 text-center sm:text-left">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-white">
                Notre Localisation
              </h3>
              <div className="relative w-full h-[250px] sm:h-[200px] md:h-[220px] lg:h-[240px] rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 border border-white/10">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3271.2345678901234!2d10.0956!3d35.6769!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12f8b4c8c8c8c8c8%3A0x8c8c8c8c8c8c8c8c!2sKairouan%2C%20Tunisia!5e0!3m2!1sen!2stn!4v1640995200000!5m2!1sen!2stn"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Rannen Auto Motors Location - Kairouan, Tunisia"
                  className="w-full h-full absolute inset-0"
                ></iframe>
              </div>
            </div>
          </div>

          {/* Copyright - Compact */}
          <div className="border-t border-gray-700/50 pt-4 sm:pt-5 mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-white/70 hover:text-[#F97316] transition-colors duration-200">
              &copy; 2025 RAM Auto Motors. Tous droits réservés.
            </p>
          </div>
        </div>
      </section>
    </footer>
  );
};

export default Footer;
