# Ferre Inti - Tienda en Línea de Ferretería

## Problema Original
El usuario tenía su tienda en línea Ferre Inti con dos requerimientos:
1. Corregir errores en la sección de productos
2. Agregar funcionalidad para cambiar entre vista de mosaico (grid) y vista de lista para los productos

## Arquitectura
- **Frontend**: React.js con Tailwind CSS
- **Backend**: FastAPI (Python)
- **Base de datos**: MongoDB
- **Componentes UI**: Radix UI / shadcn-ui

## User Personas
- Clientes de ferretería buscando herramientas
- Administradores gestionando productos, pedidos y usuarios

## Requisitos Core (Estáticos)
- Sistema de autenticación (email/password + Google OAuth)
- Catálogo de productos con categorías
- Carrito de compras
- Lista de favoritos (wishlist)
- Sistema de pedidos con cálculo de envío
- Panel de administración

## Lo Implementado - Fecha: 10 Feb 2026
### Funcionalidad de Toggle de Vista (Grid/List)
- Componente `ViewToggle` con botones para cambiar entre vistas
- Componente `ProductListItem` para vista de lista
- Vista toggle implementada en:
  - CategoryPage (`/categoria/:slug`)
  - SearchPage (`/buscar`)
  - OffersPage (`/ofertas`)
  - BestsellersPage (`/mas-vendidos`)
  - NewProductsPage (`/nuevos`)

### Características de la Vista Lista
- Imagen del producto
- SKU
- Nombre y descripción
- Rating y número de reviews
- Precio con descuento si aplica
- Botón de añadir a favoritos
- Botón de añadir al carrito

## Backlog Priorizado

### P0 (Crítico)
- N/A - Funcionalidad principal completada

### P1 (Alta Prioridad)
- Corregir imagen rota de "Llave Ajustable 10 Pulgadas"
- Resolver warnings de React sobre keys duplicadas

### P2 (Media Prioridad)
- Agregar persistencia de preferencia de vista (localStorage)
- Filtros adicionales (precio, rating, etc.)
- Ordenamiento de productos

## Próximas Tareas
1. Agregar ruta `/productos` para ver todos los productos
2. Mejorar SEO con meta tags
3. Implementar lazy loading de imágenes
