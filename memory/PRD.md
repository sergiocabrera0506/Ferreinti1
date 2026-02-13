# FERRE INTI - E-commerce de Ferretería

## Descripción del Proyecto
Tienda e-commerce de ferretería con panel de administración completo.

## Estado Actual
- **Frontend:** React con Shadcn/UI
- **Backend:** FastAPI con MongoDB
- **Base de datos:** MongoDB Atlas (remoto)
- **Imágenes:** Cloudinary (integrado)

---

## Funcionalidades Implementadas

### Tienda (Frontend Público)
- [x] Página de inicio con categorías y productos destacados
- [x] Navegación por categorías
- [x] Búsqueda de productos
- [x] Vista detallada de producto
- [x] **Vista lista/mosaico para productos**
- [x] Carrito de compras
- [x] Lista de deseos
- [x] Checkout con Stripe
- [x] Cálculo de envío por distancia
- [x] Autenticación (registro, login, Google OAuth)

### Panel de Administración
- [x] Dashboard con estadísticas
- [x] Gestión de productos (CRUD completo)
- [x] Gestión de categorías
- [x] Gestión de pedidos
- [x] Gestión de usuarios
- [x] Importación CSV de productos
- [x] **Integración Cloudinary para imágenes** (NUEVO)
- [x] Configuración de envíos

---

## Integración Cloudinary (2025-02-13)

### Configuración
```
Cloud Name: dqffj2xu7
API Key: 591817451345384
API Secret: [configurado en .env]
```

### Endpoints Disponibles
- `GET /api/cloudinary/config` - Configuración pública
- `GET /api/cloudinary/signature` - Genera firma para uploads
- `DELETE /api/cloudinary/delete` - Eliminar imagen (admin)

### Componente Frontend
- `/frontend/src/components/ImageUpload.jsx`
- Soporte para drag & drop
- Subida múltiple
- Vista previa de imágenes
- Optimización automática (WebP, quality auto)

### Documentación
- `/app/CLOUDINARY_SETUP.md` - Guía completa de implementación local

---

## Arquitectura

### Backend (FastAPI)
```
/app/backend/
├── server.py          # Servidor principal
├── .env               # Variables de entorno
└── requirements.txt   # Dependencias
```

### Frontend (React)
```
/app/frontend/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes Shadcn
│   │   └── ImageUpload.jsx  # Upload de imágenes
│   ├── pages/
│   │   ├── admin/           # Panel de administración
│   │   └── ...              # Páginas públicas
│   └── App.js
└── .env
```

---

## Endpoints API Principales

### Autenticación
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Productos
- `GET /api/products`
- `GET /api/products/{id}`
- `GET /api/admin/products` (admin)
- `POST /api/admin/products` (admin)
- `PUT /api/admin/products/{id}` (admin)
- `DELETE /api/admin/products/{id}` (admin)

### Cloudinary
- `GET /api/cloudinary/config`
- `GET /api/cloudinary/signature`
- `DELETE /api/cloudinary/delete` (admin)

---

## Credenciales de Prueba

### Admin Local
```
Email: admin@ferreinti.com
Password: admin123
```

---

## Próximos Pasos Sugeridos

1. **Subir las 600 imágenes de productos**
   - Usar el panel de Cloudinary o el componente de upload
   - Actualizar URLs en base de datos

2. **Optimización de imágenes existentes**
   - Migrar imágenes actuales a Cloudinary
   - Usar transformaciones automáticas

3. **Mejoras opcionales**
   - Sistema de notificaciones
   - Reportes de ventas
   - Múltiples idiomas

---

## Notas Técnicas

- El primer usuario registrado se convierte en admin automáticamente
- Las imágenes se optimizan automáticamente con formato WebP
- El envío se calcula por distancia desde la tienda
