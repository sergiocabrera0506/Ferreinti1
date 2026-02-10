# Ferre Inti - PRD (Product Requirements Document)

## Problema Original
Tienda en línea Ferre Inti de ferretería. El usuario quiere:
1. Usar el panel admin existente para subir artículos
2. Que los artículos se guarden persistentemente
3. Pulir detalles y mejorar lo necesario
4. Crear documentación de cambios y funcionalidades

## Arquitectura

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py`: API principal con 40+ endpoints
- Autenticación: JWT + Google OAuth (Emergent Auth)
- Pagos: Stripe Checkout integrado
- Envíos: Cálculo por distancia con fórmula configurable
- Importación masiva: Endpoint `/api/admin/import-products`

### Frontend (React + Tailwind + Shadcn)
- `/app/frontend/src/App.js`: Tienda completa
- `/app/frontend/src/pages/admin/`: Panel de administración
- Contextos: Auth, Cart, Wishlist

## Personas de Usuario
1. **Comprador:** Busca productos, agrega al carrito, paga con Stripe
2. **Admin:** Gestiona productos, categorías, pedidos, usuarios, envíos

## Implementado (Feb 2026)

### Tienda Cliente
- [x] Homepage con banner, categorías, ofertas, más vendidos, nuevos
- [x] Navegación por categorías (9 categorías activas)
- [x] Detalle de producto con galería, reviews, relacionados
- [x] Carrito y checkout con Stripe
- [x] Lista de deseos
- [x] Buscador de productos
- [x] Autenticación dual (JWT + Google)
- [x] Perfil y pedidos del usuario
- [x] 36 productos (15 originales + 21 importados del CSV)

### Panel Admin
- [x] Dashboard con estadísticas
- [x] CRUD de productos (crear, editar, eliminar)
- [x] CRUD de categorías
- [x] Gestión de pedidos (cambiar estados)
- [x] Gestión de usuarios (asignar admin)
- [x] Configuración de envíos por zonas
- [x] Importación masiva de productos desde CSV (con vista previa)

### Mejoras UI/UX (Feb 10, 2026)
- [x] Ojo para ver/ocultar contraseña en login
- [x] Botones comprar/carrito fijos en móvil
- [x] Sidebar admin sticky al hacer scroll
- [x] Categorías en footer limitadas con scroll
- [x] Scroll to top al abrir producto
- [x] Eliminada marca "Made with Emergent"
- [x] **Rediseño visual completo:**
  - Bordes redondeados (2xl) en tarjetas, botones, banners
  - Sombras suaves con efecto hover elevado
  - Gradientes en precios y badges
  - Animaciones más fluidas (cubic-bezier)
  - Estrellas de calificación visuales
  - Íconos de categorías con sombra
  - Login con fondo gradiente y tarjeta elegante
  - Espaciado más generoso entre secciones

### Credenciales Admin
- Email: admin@ferreinti.com
- Password: admin123

### Nuevas Categorías Agregadas
- Adhesivos y Pegamentos
- Fontanería y Grifería  
- Hogar y Limpieza

## Backlog Priorizado

### P1 (Importante)
- [ ] Agregar precios a productos con precio $0
- [ ] Mercado Pago (cuando se proporcionen keys)
- [ ] Geocoding automático (Google Maps API)

### P2 (Mejoras)
- [ ] Cupones de descuento
- [ ] Notificaciones por email
- [ ] Chat de soporte

## Tareas Siguientes
1. Agregar precios reales a los 21 productos importados (actualmente $0)
2. Configurar Stripe con clave de producción
3. Agregar URLs reales de redes sociales
4. Configurar ubicación exacta de la tienda
