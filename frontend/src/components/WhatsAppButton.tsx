import React from 'react';
import { FaWhatsapp } from 'react-icons/fa';

const WhatsAppButton = () => {
  // رقم الواتساب - يمكن تغييره حسب الحاجة
  const phoneNumber = '21623167813'; // رقم الواتساب الخاص بك
  const message = 'Bonjour! Je suis intéressé par vos produits.';
  
  const handleWhatsAppClick = () => {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {/* WhatsApp Floating Button */}
      <button
        onClick={handleWhatsAppClick}
        className="fixed bottom-6 right-6 z-50 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 group w-12 h-12 md:w-14 md:h-14 bg-[#25D366] shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
        aria-label="Contact us on WhatsApp"
        title="Contactez-nous sur WhatsApp"
      >
        {/* WhatsApp Icon */}
        <FaWhatsapp className="w-6 h-6 md:w-7 md:h-7 text-white" />
        
        {/* Notification Badge */}
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          1
        </span>
        
        {/* Tooltip */}
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          Contactez-nous sur WhatsApp
        </span>
      </button>
    </>
  );
};

export default WhatsAppButton;

