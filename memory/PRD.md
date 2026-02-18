# FERRE INTI - PRD (Product Requirements Document)

## Problema Original
Clonar repositorio de ferretería desde GitHub, verificar funcionamiento y preparar para uso de panel admin.
- **Repositorio**: https://github.com/sergiocabrera0506/Ferreinti1.0/tree/conflict_080226_1012

## Arquitectura

### Tech Stack
- **Frontend**: React 19 + TailwindCSS + shadcn/ui
- **Backend**: FastAPI (Python)
- **Base de datos**: MongoDB
- **Pagos**: Stripe (integrado)

### Estructura de Archivos Principales
```
/app/
├── backend/
│   ├── server.py          # API principal FastAPI
│   ├── requirements.txt   # Dependencias Python
│   └── .env               # Variables de entorno
├── frontend/
│   ├── src/
│   │   ├── App.js         # Componente principal React
│   │   ├── pages/admin/   # Panel de administración
│   │   └── components/ui/ # Componentes shadcn
│   └── package.json
└── memory/
    └── PRD.md             # Este archivo
```

## User Personas

### 1. Cliente (customer)
- Navega productos por categoría
- Busca productos
- Agrega al carrito
- Realiza compras con Stripe
- Deja reseñas

### 2. Administrador (admin)
- El **primer usuario registrado** se convierte en admin automáticamente
- Gestiona productos (CRUD completo)
- Gestiona categorías
- Ve estadísticas del dashboard
- Gestiona pedidos y usuarios
- Configura envíos

## Core Requirements (Implementado)

### Funcionalidades Cliente
- [x] Página principal con banner hero y categorías
- [x] Listado de productos por categoría
- [x] Búsqueda de productos
- [x] Detalle de producto con variantes/tamaños
- [x] Carrito de compras
- [x] Lista de deseos (favoritos)
- [x] Sistema de reseñas
- [x] Checkout con Stripe
- [x] Historial de pedidos

### Panel Admin (/admin)
- [x] Dashboard con estadísticas
- [x] CRUD de Productos
- [x] CRUD de Categorías
- [x] Gestión de Pedidos
- [x] Gestión de Usuarios
- [x] Configuración de Envíos
- [x] Importación CSV (formato Shopify)

### APIs Implementadas
- Auth: registro, login, logout, Google OAuth
- Productos: CRUD, búsqueda, filtros
- Categorías: CRUD
- Carrito: add, update, remove, clear
- Wishlist: add, remove
- Reviews: create, list
- Orders: create, list, update status
- Payments: Stripe checkout
- Admin: dashboard, reports

## What's Been Implemented
**Fecha**: Feb 18, 2026

1. Clonado repositorio exitosamente
2. Configuración de variables de entorno
3. Backend funcionando al 100%
4. Frontend funcionando al 95%
5. Base de datos inicializada con datos seed
6. 6 categorías y 15 productos de ejemplo

## Próximos Pasos (Usuario)
1. Registrarse como primer usuario para obtener rol admin
2. Acceder a /admin para gestionar productos
3. Subir productos propios
4. Configurar redes sociales en Footer (App.js línea 657-670)
5. Configurar ubicación del mapa (App.js línea 786-816)

## Backlog / Mejoras Futuras
- P1: Configurar pasarela de pago en producción
- P1: Personalizar logo y colores de marca
- P2: Agregar más métodos de pago
- P2: Sistema de notificaciones por email
- P3: App móvil nativa
