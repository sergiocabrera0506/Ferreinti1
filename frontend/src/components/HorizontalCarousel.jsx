import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ============================================================
   COMPONENTE: CARRUSEL HORIZONTAL CON FLECHAS
   
   Uso: Envuelve cualquier contenido horizontal scrolleable
   y agrega flechas de navegación a los costados.
   
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
    /* ============================================================
       CONTENEDOR PRINCIPAL
       - flex con flechas a los costados
       - gap-2: espacio entre flechas y contenido
       ============================================================ */
    <div className={`flex items-center gap-2 ${className}`}>
      
      {/* ============================================================
          FLECHA IZQUIERDA - A un costado del contenido
          ============================================================ */}
      {showArrows && (
        <button
          onClick={() => scroll('left')}
          className={`
            flex-shrink-0
            w-10 h-10 md:w-11 md:h-11
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700
            shadow-md rounded-full
            flex items-center justify-center
            transition-all duration-300
            hover:bg-gray-100 dark:hover:bg-gray-700
            hover:scale-110 hover:shadow-lg
            ${canScrollLeft 
              ? 'opacity-100' 
              : 'opacity-30 cursor-not-allowed'
            }
          `}
          disabled={!canScrollLeft}
          aria-label="Anterior"
          data-testid="carousel-scroll-left"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-700 dark:text-gray-200" />
        </button>
      )}

      {/* ============================================================
          CONTENEDOR SCROLLEABLE
          - flex-1: ocupa el espacio disponible entre las flechas
          - overflow-x-auto: permite scroll horizontal
          ============================================================ */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {children}
        </div>
      </div>

      {/* ============================================================
          FLECHA DERECHA - A un costado del contenido
          ============================================================ */}
      {showArrows && (
        <button
          onClick={() => scroll('right')}
          className={`
            flex-shrink-0
            w-10 h-10 md:w-11 md:h-11
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-700
            shadow-md rounded-full
            flex items-center justify-center
            transition-all duration-300
            hover:bg-gray-100 dark:hover:bg-gray-700
            hover:scale-110 hover:shadow-lg
            ${canScrollRight 
              ? 'opacity-100' 
              : 'opacity-30 cursor-not-allowed'
            }
          `}
          disabled={!canScrollRight}
          aria-label="Siguiente"
          data-testid="carousel-scroll-right"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-gray-700 dark:text-gray-200" />
        </button>
      )}
    </div>
  );
};

export default HorizontalCarousel;
