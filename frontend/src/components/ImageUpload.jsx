import React, { useState, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Check, GripVertical } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Componente para cada imagen arrastrable
const SortableImage = ({ id, img, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square group rounded-lg overflow-hidden border ${isDragging ? 'ring-2 ring-primary shadow-lg' : ''}`}
      data-testid={`uploaded-image-${index}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 w-6 h-6 bg-black/60 text-white rounded flex items-center justify-center cursor-grab active:cursor-grabbing z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      <img
        src={typeof img === 'string' ? img : img.url}
        alt={`Imagen ${index + 1}`}
        className="w-full h-full object-cover pointer-events-none"
      />
      
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="absolute top-1 right-1 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          data-testid={`remove-image-${index}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
      
      {index === 0 && (
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
          Principal
        </span>
      )}
    </div>
  );
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ImageUpload = ({ 
  onUploadComplete, 
  folder = 'products',
  multiple = false,
  maxFiles = 5,
  existingImages = [],
  onRemoveImage,
  onReorderImages
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  
  // ID único para este componente
  const inputId = React.useId();

  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id && onReorderImages) {
      const oldIndex = existingImages.findIndex((_, idx) => `image-${idx}` === active.id);
      const newIndex = existingImages.findIndex((_, idx) => `image-${idx}` === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(existingImages, oldIndex, newIndex);
        onReorderImages(newOrder);
      }
    }
  };

  // Función para comprimir y convertir imagen a WebP
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo proporción
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Crear canvas para comprimir
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a WebP
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Crear nuevo archivo con extensión .webp
              const webpFile = new File(
                [blob], 
                file.name.replace(/\.[^/.]+$/, '.webp'),
                { type: 'image/webp' }
              );
              resolve(webpFile);
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          },
          'image/webp',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadToCloudinary = async (file) => {
    try {
      // Comprimir y convertir a WebP antes de subir
      let fileToUpload = file;
      try {
        fileToUpload = await compressImage(file);
        console.log(`Imagen comprimida: ${(file.size / 1024).toFixed(1)}KB → ${(fileToUpload.size / 1024).toFixed(1)}KB`);
      } catch (compressError) {
        console.warn('No se pudo comprimir, subiendo original:', compressError);
      }

      // Get signature from backend
      const sigResponse = await fetch(`${API}/cloudinary/signature?folder=${folder}&resource_type=image`, {
        credentials: 'include'
      });
      
      if (!sigResponse.ok) {
        throw new Error('Error al obtener firma de Cloudinary');
      }
      
      const sig = await sigResponse.json();

      // Create form data for Cloudinary
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('api_key', sig.api_key);
      formData.append('timestamp', sig.timestamp);
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);

      // Upload to Cloudinary
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Error al subir imagen a Cloudinary');
      }

      const result = await uploadResponse.json();
      
      // Return optimized URL with WebP format
      const optimizedUrl = `https://res.cloudinary.com/${sig.cloud_name}/image/upload/f_auto,q_auto/${result.public_id}`;
      
      return {
        url: optimizedUrl,
        public_id: result.public_id,
        original_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleFiles = useCallback(async (files) => {
    const validFiles = Array.from(files).filter(file => {
      const isValid = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB max
      if (!isValid) toast.error(`${file.name} no es una imagen válida`);
      if (!isValidSize) toast.error(`${file.name} excede 10MB`);
      return isValid && isValidSize;
    });

    if (validFiles.length === 0) return;

    const filesToUpload = multiple 
      ? validFiles.slice(0, maxFiles - existingImages.length) 
      : [validFiles[0]];

    if (filesToUpload.length < validFiles.length) {
      toast.warning(`Solo se pueden subir ${maxFiles} imágenes máximo`);
    }

    setUploading(true);
    const uploadedImages = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const fileId = `${file.name}-${Date.now()}`;
      
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      try {
        // Simulate progress (Cloudinary doesn't provide real progress)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => ({
            ...prev,
            [fileId]: Math.min((prev[fileId] || 0) + 20, 90)
          }));
        }, 200);

        const result = await uploadToCloudinary(file);
        
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));
        
        uploadedImages.push(result);
        toast.success(`${file.name} subida correctamente`);

        // Clear progress after a moment
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileId];
            return newProgress;
          });
        }, 1000);

      } catch (error) {
        toast.error(`Error al subir ${file.name}`);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
      }
    }

    setUploading(false);

    if (uploadedImages.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedImages);
    }
  }, [folder, multiple, maxFiles, existingImages.length, onUploadComplete]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && document.getElementById(inputId).click()}
        data-testid="image-upload-dropzone"
      >
        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={uploading}
        />
        
        <div className="flex flex-col items-center gap-2 text-center">
          {uploading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : (
            <Upload className="w-10 h-10 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">
              {uploading ? 'Subiendo imágenes...' : 'Arrastra imágenes aquí'}
            </p>
            <p className="text-sm text-muted-foreground">
              {multiple 
                ? `Haz clic para seleccionar varias (máx ${maxFiles - existingImages.length} más)`
                : 'Haz clic para seleccionar una imagen'
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              WebP, JPG, PNG - máx 10MB cada una
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId} className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10">
                {progress === 100 ? <Check className="w-4 h-4 text-green-500" /> : `${progress}%`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Existing Images Preview with Drag and Drop */}
      {existingImages.length > 0 && (
        <div>
          {existingImages.length > 1 && (
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <GripVertical className="w-3 h-3" />
              Arrastra las imágenes para cambiar el orden. La primera será la principal.
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={existingImages.map((_, idx) => `image-${idx}`)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {existingImages.map((img, idx) => (
                  <SortableImage
                    key={`image-${idx}`}
                    id={`image-${idx}`}
                    img={img}
                    index={idx}
                    onRemove={onRemoveImage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Tips */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Tamaño recomendado: 800x800 px (cuadrado)</p>
        <p>• Formatos: WebP, JPEG, PNG, GIF</p>
        <p>• Las imágenes se optimizan automáticamente</p>
      </div>
    </div>
  );
};

export default ImageUpload;
