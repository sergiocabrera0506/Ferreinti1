import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ============================================================
   COMPONENTE: CARRUSEL HORIZONTAL CON FLECHAS
   
   Uso: Envuelve cualquier contenido horizontal scrolleable
   y agrega flechas de navegación automáticamente.
   
   Props:
   - children: contenido del carrusel
   - scrollAmount: píxeles a mover con cada clic (default: 300)
   - showArrows: mostrar/ocultar flechas (default: true)
   - className: clases adicionales para el contenedor
   ============================================================ */

const HorizontalCarousel = ({ 
  children, 
  scrollAmount = 300,
  showArrows = true,
  className = ""
}) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Verificar si se puede hacer scroll en cada dirección
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        scrollElement.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [children]);

  // Función para hacer scroll
  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -scrollAmount : scrollAmount;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {/* ============================================================
          CONTENEDOR SCROLLEABLE
          - overflow-x-auto: permite scroll horizontal
          - scrollbar-hide: oculta la barra de scroll (definido en CSS)
          ============================================================ */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide pb-4 -mb-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {children}
      </div>

      {/* ============================================================
          FLECHAS DE NAVEGACIÓN
          - Se muestran solo cuando hay contenido en esa dirección
          - Aparecen al pasar el mouse (group-hover)
          - Siempre visibles en móvil para mejor UX táctil
          ============================================================ */}
      {showArrows && (
        <>
          {/* Flecha izquierda */}
          <button
            onClick={() => scroll('left')}
            className={`
              absolute left-0 top-1/2 -translate-y-1/2 z-10
              w-10 h-10 md:w-12 md:h-12
              bg-white dark:bg-gray-800 
              shadow-lg rounded-full
              flex items-center justify-center
              transition-all duration-300
              hover:bg-gray-100 dark:hover:bg-gray-700
              hover:scale-110
              ${canScrollLeft 
                ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-x-0' 
                : 'opacity-0 pointer-events-none -translate-x-4'
              }
            `}
            aria-label="Anterior"
            data-testid="carousel-scroll-left"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-700 dark:text-gray-200" />
          </button>

          {/* Flecha derecha */}
          <button
            onClick={() => scroll('right')}
            className={`
              absolute right-0 top-1/2 -translate-y-1/2 z-10
              w-10 h-10 md:w-12 md:h-12
              bg-white dark:bg-gray-800
              shadow-lg rounded-full
              flex items-center justify-center
              transition-all duration-300
              hover:bg-gray-100 dark:hover:bg-gray-700
              hover:scale-110
              ${canScrollRight 
                ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-x-0' 
                : 'opacity-0 pointer-events-none translate-x-4'
              }
            `}
            aria-label="Siguiente"
            data-testid="carousel-scroll-right"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-700 dark:text-gray-200" />
          </button>
        </>
      )}

      {/* ============================================================
          GRADIENTES DE FADE
          Indican visualmente que hay más contenido
          ============================================================ */}
      <div 
        className={`
          absolute left-0 top-0 bottom-4 w-8 md:w-12
          bg-gradient-to-r from-background to-transparent 
          pointer-events-none
          transition-opacity duration-300
          ${canScrollLeft ? 'opacity-100' : 'opacity-0'}
        `} 
      />
      <div 
        className={`
          absolute right-0 top-0 bottom-4 w-8 md:w-12
          bg-gradient-to-l from-background to-transparent 
          pointer-events-none
          transition-opacity duration-300
          ${canScrollRight ? 'opacity-100' : 'opacity-0'}
        `} 
      />
    </div>
  );
};

export default HorizontalCarousel;
