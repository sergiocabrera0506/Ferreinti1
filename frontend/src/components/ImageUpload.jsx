import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Upload, X, Loader2, ImagePlus } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ImageUpload = ({ folder = 'products', multiple = false, maxFiles = 8, existingImages = [], onUploadComplete, onRemoveImage }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const remainingSlots = maxFiles - existingImages.length;
    if (files.length > remainingSlots) {
      toast.error(`Solo puedes subir ${remainingSlots} imagenes mas`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} es muy grande (max 10MB)`);
        continue;
      }

      try {
        const sigResponse = await axios.get(`${API}/cloudinary/signature?folder=${folder}`, { withCredentials: true });
        const { signature, timestamp, cloud_name, api_key } = sigResponse.data;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('signature', signature);
        formData.append('timestamp', timestamp);
        formData.append('api_key', api_key);
        formData.append('folder', folder);

        const uploadResponse = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
          formData,
          {
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(Math.round(((i * 100) + percentCompleted) / files.length));
            }
          }
        );

        uploadedImages.push({
          url: uploadResponse.data.secure_url,
          public_id: uploadResponse.data.public_id
        });

      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`Error al subir ${file.name}`);
      }
    }

    if (uploadedImages.length > 0) {
      onUploadComplete(uploadedImages);
      toast.success(`${uploadedImages.length} imagen(es) subida(s)`);
    }

    setUploading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3" data-testid="image-upload">
      {existingImages.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {existingImages.map((img, idx) => (
            <div key={idx} className="relative group">
              <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border" />
              {onRemoveImage && (
                <button
                  type="button"
                  onClick={() => onRemoveImage(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`remove-image-${idx}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {idx === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] text-center rounded-b-lg">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {existingImages.length < maxFiles && (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            uploading ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
          }`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={handleFileSelect}
            className="hidden"
            data-testid="image-file-input"
          />

          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Subiendo... {uploadProgress}%</p>
              <div className="w-full bg-muted rounded-full h-1.5 max-w-xs mx-auto">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Haz clic para subir imagenes
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP (max 10MB) - {maxFiles - existingImages.length} disponibles
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
