import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

/* ============================================================
   COMPONENTE: CARRUSEL DE BANNERS
   
   Este componente muestra los banners de publicidad en la página de inicio.
   Los banners se cargan desde la API y se muestran en un carrusel automático.
   
   CONFIGURACIÓN RÁPIDA:
   - Modifica CAROUSEL_CONFIG para cambiar el comportamiento
   - Los estilos responsivos están en las clases de Tailwind
   ============================================================ */

const CAROUSEL_CONFIG = {
  // Tiempo entre cada slide (en milisegundos)
  // Cambia este valor para hacer el carrusel más rápido o lento
  autoplayInterval: 5000,
  
  // Mostrar flechas de navegación
  showArrows: true,
  
  // Mostrar puntos indicadores
  showDots: true,
  
  // Pausar autoplay al pasar el mouse
  pauseOnHover: true
};

/* ============================================================
   ESTILOS RESPONSIVOS DEL BANNER
   
   Modifica estas clases para ajustar cómo se ve el banner:
   - h-[300px]: altura en móvil
   - md:h-[400px]: altura en tablet
   - lg:h-[500px]: altura en escritorio
   ============================================================ */
const BANNER_HEIGHT_CLASSES = "h-[300px] md:h-[400px] lg:h-[500px]";

const BannerCarousel = ({ banners = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

  // Función para ir al siguiente slide
  const nextSlide = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // Función para ir al slide anterior
  const prevSlide = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Autoplay del carrusel
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    
    const interval = setInterval(nextSlide, CAROUSEL_CONFIG.autoplayInterval);
    return () => clearInterval(interval);
  }, [banners.length, isPaused, nextSlide]);

  // Manejar clic en el banner
  const handleBannerClick = (banner) => {
    if (banner.link) {
      // Si el link es interno (empieza con /) usar navigate
      if (banner.link.startsWith('/')) {
        navigate(banner.link);
      } else {
        // Si es externo, abrir en nueva pestaña
        window.open(banner.link, '_blank');
      }
    }
  };

  // Si no hay banners, no mostrar nada
  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    /* ============================================================
       CONTENEDOR PRINCIPAL DEL CARRUSEL
       - relative: para posicionar elementos absolutos dentro
       - overflow-hidden: para ocultar slides que no están visibles
       - Las clases de altura se definen en BANNER_HEIGHT_CLASSES
       ============================================================ */
    <section 
      className={`relative w-full ${BANNER_HEIGHT_CLASSES} overflow-hidden bg-secondary`}
      onMouseEnter={() => CAROUSEL_CONFIG.pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      data-testid="banner-carousel"
    >
      {/* ============================================================
          SLIDES DEL CARRUSEL
          Cada banner se posiciona absolutamente y se mueve con transform
          ============================================================ */}
      <div 
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner, index) => (
          <div
            key={banner.banner_id || index}
            className="w-full h-full flex-shrink-0 relative cursor-pointer"
            onClick={() => handleBannerClick(banner)}
          >
            {/* ============================================================
                IMAGEN DEL BANNER
                - object-cover: la imagen cubre todo el espacio sin deformarse
                - w-full h-full: ocupa todo el contenedor
                
                IMPORTANTE PARA MÓVIL:
                La imagen se ajusta automáticamente gracias a object-cover
                ============================================================ */}
            <img
              src={banner.image}
              alt={banner.title || 'Banner promocional'}
              className="w-full h-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
            />
            
            {/* ============================================================
                OVERLAY DEGRADADO
                Oscurece la parte inferior para que el texto sea legible
                Modifica los colores si quieres un efecto diferente
                ============================================================ */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            
            {/* ============================================================
                CONTENIDO DEL BANNER (título, subtítulo, botón)
                - Se posiciona en la parte inferior
                - Padding responsivo: p-6 en móvil, p-8 en tablet, p-12 en escritorio
                ============================================================ */}
            {(banner.title || banner.subtitle || banner.button_text) && (
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-12">
                <div className="max-w-7xl mx-auto">
                  {/* Título - tamaño responsivo */}
                  {banner.title && (
                    <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                      {banner.title}
                    </h2>
                  )}
                  
                  {/* Subtítulo - tamaño responsivo */}
                  {banner.subtitle && (
                    <p className="text-base md:text-lg lg:text-xl text-white/90 mb-4 max-w-2xl">
                      {banner.subtitle}
                    </p>
                  )}
                  
                  {/* Botón de acción */}
                  {banner.button_text && (
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-3 rounded-lg shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBannerClick(banner);
                      }}
                    >
                      {banner.button_text}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ============================================================
          FLECHAS DE NAVEGACIÓN
          Solo se muestran si hay más de 1 banner
          ============================================================ */}
      {CAROUSEL_CONFIG.showArrows && banners.length > 1 && (
        <>
          {/* Flecha izquierda */}
          <button
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
            aria-label="Banner anterior"
            data-testid="carousel-prev"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          {/* Flecha derecha */}
          <button
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
            aria-label="Banner siguiente"
            data-testid="carousel-next"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* ============================================================
          PUNTOS INDICADORES
          Muestran en qué slide estás y permiten navegar directamente
          ============================================================ */}
      {CAROUSEL_CONFIG.showDots && banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
              className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-white w-6 md:w-8' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Ir al banner ${index + 1}`}
              data-testid={`carousel-dot-${index}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default BannerCarousel;
