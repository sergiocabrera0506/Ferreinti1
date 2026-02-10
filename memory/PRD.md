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
- [x] Navegación por categorías
- [x] Detalle de producto con galería, reviews, relacionados
- [x] Carrito y checkout con Stripe
- [x] Lista de deseos
- [x] Buscador de productos
- [x] Autenticación dual (JWT + Google)
- [x] Perfil y pedidos del usuario
- [x] 15 productos de ejemplo en 6 categorías

### Panel Admin
- [x] Dashboard con estadísticas
- [x] CRUD de productos (crear, editar, eliminar)
- [x] CRUD de categorías
- [x] Gestión de pedidos (cambiar estados)
- [x] Gestión de usuarios (asignar admin)
- [x] Configuración de envíos por zonas

### Credenciales Admin
- Email: admin@ferreinti.com
- Password: admin123

## Backlog Priorizado

### P1 (Importante)
- [ ] Mercado Pago (cuando se proporcionen keys)
- [ ] Geocoding automático (Google Maps API)
- [ ] Notificaciones por email

### P2 (Mejoras)
- [ ] Cupones de descuento
- [ ] Chat de soporte
- [ ] Reportes avanzados

## Tareas Siguientes
1. Usuario debe agregar sus productos reales reemplazando los de ejemplo
2. Configurar Stripe con clave de producción
3. Agregar URLs reales de redes sociales
4. Configurar ubicación exacta de la tienda
