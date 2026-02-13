# Guía de Integración de Cloudinary - FERRE INTI

## Tu Configuración de Cloudinary
```
Cloud Name: dqffj2xu7
API Key: 591817451345384
API Secret: RfhKjdsKzRn5_OT5gx-203hYguc
```

---

## PASO 1: Configurar el Backend (.env)

Abre el archivo `backend/.env` y agrega estas líneas:

```env
CLOUDINARY_CLOUD_NAME=dqffj2xu7
CLOUDINARY_API_KEY=591817451345384
CLOUDINARY_API_SECRET=RfhKjdsKzRn5_OT5gx-203hYguc
```

---

## PASO 2: Instalar Cloudinary en Python

Ejecuta en tu terminal (carpeta backend):
```bash
cd backend
pip install cloudinary
```

---

## PASO 3: Agregar Código al Backend (run.py o server.py)

### 3.1 Agregar imports al inicio del archivo:
```python
import time
import cloudinary
import cloudinary.utils
import cloudinary.uploader
```

### 3.2 Agregar configuración de Cloudinary (después de cargar .env):
```python
# Cloudinary configuration
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)
```

### 3.3 Agregar estos endpoints (antes de los routes de admin):
```python
# ==================== CLOUDINARY ROUTES ====================

ALLOWED_FOLDERS = ("products/", "categories/", "users/", "uploads/")

@app.get("/api/cloudinary/signature")
def generate_cloudinary_signature(
    resource_type: str = "image",
    folder: str = "products"
):
    """Generate signed upload params for Cloudinary"""
    folder_with_slash = folder if folder.endswith("/") else f"{folder}/"
    if not any(folder_with_slash.startswith(allowed) for allowed in ALLOWED_FOLDERS):
        raise HTTPException(status_code=400, detail="Carpeta no permitida")

    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
    }

    signature = cloudinary.utils.api_sign_request(
        params,
        os.environ.get("CLOUDINARY_API_SECRET")
    )

    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.environ.get("CLOUDINARY_API_KEY"),
        "folder": folder,
        "resource_type": resource_type
    }

@app.get("/api/cloudinary/config")
def get_cloudinary_config():
    """Get Cloudinary config for frontend"""
    return {
        "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME"),
        "max_file_size": 10485760,
        "allowed_formats": ["jpg", "jpeg", "png", "webp", "gif"]
    }
```

---

## PASO 4: Crear componente ImageUpload en Frontend

Crea el archivo: `frontend/src/components/ImageUpload.jsx`

```jsx
import React, { useState, useCallback } from 'react';
import { Upload, X, Loader2, Check } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ImageUpload = ({ 
  onUploadComplete, 
  folder = 'products',
  multiple = false,
  maxFiles = 5,
  existingImages = [],
  onRemoveImage
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);

  const uploadToCloudinary = async (file) => {
    try {
      const sigResponse = await fetch(`${API}/cloudinary/signature?folder=${folder}&resource_type=image`, {
        credentials: 'include'
      });
      
      if (!sigResponse.ok) throw new Error('Error al obtener firma');
      
      const sig = await sigResponse.json();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sig.api_key);
      formData.append('timestamp', sig.timestamp);
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!uploadResponse.ok) throw new Error('Error al subir imagen');

      const result = await uploadResponse.json();
      const optimizedUrl = `https://res.cloudinary.com/${sig.cloud_name}/image/upload/f_auto,q_auto/${result.public_id}`;
      
      return { url: optimizedUrl, public_id: result.public_id };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleFiles = useCallback(async (files) => {
    const validFiles = Array.from(files).filter(file => {
      return file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024;
    });

    if (validFiles.length === 0) return;

    setUploading(true);
    const uploadedImages = [];

    for (const file of validFiles.slice(0, maxFiles - existingImages.length)) {
      try {
        const result = await uploadToCloudinary(file);
        uploadedImages.push(result);
        toast.success(`${file.name} subida`);
      } catch (error) {
        toast.error(`Error al subir ${file.name}`);
      }
    }

    setUploading(false);
    if (uploadedImages.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedImages);
    }
  }, [folder, multiple, maxFiles, existingImages.length, onUploadComplete]);

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
          ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => document.getElementById('image-upload-input').click()}
      >
        <input
          id="image-upload-input"
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        {uploading ? <Loader2 className="w-10 h-10 mx-auto animate-spin" /> : <Upload className="w-10 h-10 mx-auto text-gray-400" />}
        <p className="mt-2">{uploading ? 'Subiendo...' : 'Arrastra imágenes o haz clic'}</p>
        <p className="text-sm text-gray-500">WebP, JPG, PNG (máx 10MB)</p>
      </div>

      {existingImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {existingImages.map((img, idx) => (
            <div key={idx} className="relative aspect-square group">
              <img src={typeof img === 'string' ? img : img.url} alt="" className="w-full h-full object-cover rounded" />
              {onRemoveImage && (
                <button
                  onClick={() => onRemoveImage(idx)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4 mx-auto" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
```

---

## PASO 5: Usar el componente en AdminProducts.jsx

Importa el componente:
```jsx
import ImageUpload from '../../components/ImageUpload';
```

Reemplaza la sección de imágenes actual con:
```jsx
<ImageUpload
  folder="products"
  multiple={true}
  maxFiles={8}
  existingImages={formData.images}
  onUploadComplete={(uploadedImages) => {
    const newUrls = uploadedImages.map(img => img.url);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newUrls]
    }));
  }}
  onRemoveImage={(index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  }}
/>
```

---

## Dimensiones Recomendadas para Imágenes

| Tipo | Dimensiones | Peso Ideal |
|------|-------------|------------|
| Producto principal | 800x800 px | < 100 KB |
| Miniatura | 300x300 px | < 30 KB |
| Categoría | 600x400 px | < 80 KB |

---

## URLs de Cloudinary Optimizadas

Las imágenes se guardarán con transformaciones automáticas:
```
https://res.cloudinary.com/dqffj2xu7/image/upload/f_auto,q_auto/products/[nombre].webp
```

Esto convierte automáticamente a WebP y optimiza la calidad.

---

## Subir Imágenes en Masa (600 imágenes)

Para subir muchas imágenes, puedes:

1. **Desde el Panel de Cloudinary:**
   - Ve a https://cloudinary.com/console
   - Media Library > Upload
   - Arrastra todas las imágenes a la vez
   - Cloudinary las procesará en segundo plano

2. **Usando el Panel de Admin:**
   - Sube las imágenes de 5-10 productos a la vez
   - El sistema las optimiza automáticamente

---

## Verificar que Funciona

Ejecuta estos comandos para probar:

```bash
# Verificar config
curl http://localhost:8002/api/cloudinary/config

# Verificar firma
curl "http://localhost:8002/api/cloudinary/signature?folder=products"
```

Deberías ver tu cloud_name (dqffj2xu7) en las respuestas.
