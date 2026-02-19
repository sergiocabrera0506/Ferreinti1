import React, { useState, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, Check } from 'lucide-react';
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
      formData.append('file', file);
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
        onClick={() => !uploading && document.getElementById('image-upload-input').click()}
        data-testid="image-upload-dropzone"
      >
        <input
          id="image-upload-input"
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
              o haz clic para seleccionar (WebP, JPG, PNG - máx 10MB)
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

      {/* Existing Images Preview */}
      {existingImages.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
          {existingImages.map((img, idx) => (
            <div 
              key={idx} 
              className="relative aspect-square group rounded-lg overflow-hidden border"
              data-testid={`uploaded-image-${idx}`}
            >
              <img 
                src={typeof img === 'string' ? img : img.url} 
                alt={`Imagen ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {onRemoveImage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(idx);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`remove-image-${idx}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                  Principal
                </span>
              )}
            </div>
          ))}
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
