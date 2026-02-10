# NOTAS DE CAMBIOS Y GUÍA DE USO - FERRE INTI

## RESUMEN
Tu tienda Ferre Inti ya está lista para hacer ventas. Los productos se guardan en **MongoDB** (base de datos persistente), NO en el código. Esto significa que cuando subes un producto desde el admin, se guarda permanentemente.

---

## ACCESO AL PANEL DE ADMINISTRACIÓN

**URL:** `/admin` (ej: tudominio.com/admin)

**Credenciales:**
- Email: `admin@ferreinti.com`
- Contraseña: `admin123`

> **IMPORTANTE:** Cambia estas credenciales en producción creando un nuevo usuario admin con tu email real.

---

## QUÉ PUEDES HACER DESDE EL ADMIN

### 1. DASHBOARD (Inicio)
- Ver estadísticas: productos, usuarios, pedidos, ingresos
- Productos con bajo stock
- Pedidos recientes
- Productos más vendidos

### 2. PRODUCTOS
**Ruta:** `/admin/productos`

| Acción | Cómo hacerlo |
|--------|--------------|
| **Ver productos** | Se listan automáticamente |
| **Buscar** | Usa la barra de búsqueda |
| **Crear nuevo** | Botón "Nuevo Producto" → llena el formulario |
| **Editar** | Clic en el ícono de lápiz |
| **Eliminar** | Clic en el ícono de basura |

**Campos al crear producto:**
- Nombre del producto
- SKU (código único)
- Descripción
- Precio (y precio original si hay oferta)
- Categoría
- Stock disponible
- URLs de imágenes (separadas por coma)
- Características (separadas por coma)
- Etiquetas: ¿Es oferta? ¿Es nuevo? ¿Es bestseller?

### 3. CATEGORÍAS
**Ruta:** `/admin/categorias`

- Crear nuevas categorías
- Editar nombre, slug, imagen e ícono
- No puedes eliminar una categoría si tiene productos

**Categorías actuales:**
1. Herramientas Manuales
2. Herramientas Eléctricas
3. Conexiones Eléctricas
4. Accesorios para Baño
5. Accesorios para Cocina
6. Ruedas para Muebles

### 4. PEDIDOS
**Ruta:** `/admin/pedidos`

- Ver todos los pedidos
- Filtrar por estado
- Cambiar estado: pendiente → confirmado → enviado → entregado

**Estados disponibles:**
- `pending` - Pendiente
- `confirmed` - Confirmado
- `shipped` - Enviado
- `delivered` - Entregado
- `cancelled` - Cancelado

### 5. USUARIOS
**Ruta:** `/admin/usuarios`

- Ver todos los usuarios registrados
- Buscar por nombre o email
- Asignar/quitar rol de administrador

### 6. CONFIGURACIÓN DE ENVÍOS
**Ruta:** `/admin/envios`

- Radio de envío gratis (por defecto 5km)
- Precio por kilómetro adicional ($1.50)
- Costo mínimo de envío ($5)
- Coordenadas de tu tienda
- Calculadora de prueba

---

## CÓMO FUNCIONA EL CÁLCULO DE ENVÍO

```
Si el cliente está dentro del radio gratis (5km):
    → Envío GRATIS

Si está más lejos:
    km_extra = distancia - 5km
    costo = km_extra × $1.50
    
    Si el costo es menor a $5:
        → Se cobra $5 (mínimo)
```

---

## ESTRUCTURA DE LA TIENDA (CLIENTE)

| Página | URL | Descripción |
|--------|-----|-------------|
| Inicio | `/` | Banner, categorías, ofertas, más vendidos, nuevos |
| Categoría | `/categoria/[slug]` | Productos de una categoría |
| Producto | `/producto/[id]` | Detalle, galería, reviews, relacionados |
| Búsqueda | `/buscar?q=[texto]` | Resultados de búsqueda |
| Carrito | Drawer lateral | Se abre desde ícono de carrito |
| Checkout | `/checkout` | Dirección y pago con Stripe |
| Favoritos | `/favoritos` | Lista de deseos del usuario |
| Perfil | `/perfil` | Datos del usuario |
| Pedidos | `/pedidos` | Historial de compras |

---

## MÉTODOS DE PAGO

### Stripe (Configurado)
- Tarjetas de crédito/débito
- Funciona con tarjeta de prueba: `4242 4242 4242 4242`
- Fecha: cualquier futura
- CVC: cualquier 3 dígitos

> Para producción, cambia la clave de Stripe en `/app/backend/.env`

---

## AUTENTICACIÓN DE USUARIOS

1. **Email + Contraseña:** Registro tradicional
2. **Google:** Login con cuenta de Google (ya configurado)

El primer usuario que se registra automáticamente es **admin**.

---

## ARCHIVOS IMPORTANTES

| Archivo | Para qué sirve |
|---------|---------------|
| `/app/backend/.env` | Claves secretas (Stripe, MongoDB) |
| `/app/backend/server.py` | Toda la lógica del servidor |
| `/app/frontend/src/App.js` | Interfaz de la tienda |
| `/app/frontend/src/pages/admin/` | Panel de administración |
| `/app/frontend/src/index.css` | Colores y estilos |

---

## COMANDOS ÚTILES

```bash
# Reiniciar servicios
sudo supervisorctl restart backend frontend

# Ver estado
sudo supervisorctl status

# Ver errores del backend
tail -n 50 /var/log/supervisor/backend.err.log

# Ver errores del frontend
tail -n 50 /var/log/supervisor/frontend.err.log
```

---

## FLUJO PARA SUBIR UN PRODUCTO

1. Ingresa a `/admin`
2. Login con tus credenciales
3. Ve a "Productos" en el menú lateral
4. Clic en "Nuevo Producto"
5. Llena todos los campos:
   - Nombre descriptivo
   - SKU único (ej: MART-001)
   - Descripción detallada
   - Precio y precio original (si aplica)
   - Selecciona categoría
   - Cantidad en stock
   - URLs de imágenes (puedes usar Unsplash o tus propias imágenes)
   - Características del producto
   - Marca las etiquetas que apliquen
6. Guarda
7. El producto aparece inmediatamente en la tienda

---

## PRÓXIMOS PASOS RECOMENDADOS

1. **Cambiar credenciales admin** - Crea un usuario con tu email real
2. **Agregar tus productos** - Reemplaza los de ejemplo con tus productos reales
3. **Configurar Stripe en producción** - Usa tu clave real cuando estés listo
4. **Agregar tus redes sociales** - Edita los enlaces en el footer
5. **Configurar ubicación real** - Actualiza las coordenadas de tu tienda en `/admin/envios`

---

## SOPORTE

Si necesitas agregar funcionalidades adicionales como:
- Cupones de descuento
- Sistema de puntos
- Chat en vivo
- Notificaciones por email
- Integración con WhatsApp

¡Solo pídelo!
