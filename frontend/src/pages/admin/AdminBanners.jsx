import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Plus, Edit, Trash2, Loader2, Image as ImageIcon, X, Save, Eye, EyeOff,
  GripVertical, ArrowUp, ArrowDown, ExternalLink
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import ImageUpload from '../../components/ImageUpload';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const emptyBanner = {
  title: '',
  subtitle: '',
  image: '',
  image_mobile: '',
  link: '',
  button_text: '',
  is_active: true,
  order: 0
};

export const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [formData, setFormData] = useState(emptyBanner);
  const [saving, setSaving] = useState(false);

  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API}/admin/banners`, { withCredentials: true });
      setBanners(response.data.banners || []);
    } catch (err) {
      toast.error('Error al cargar banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const openCreateDialog = () => {
    setSelectedBanner(null);
    setFormData({
      ...emptyBanner,
      order: banners.length
    });
    setDialogOpen(true);
  };

  const openEditDialog = (banner) => {
    setSelectedBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image: banner.image || '',
      image_mobile: banner.image_mobile || '',
      link: banner.link || '',
      button_text: banner.button_text || '',
      is_active: banner.is_active !== false,
      order: banner.order || 0
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.image) {
      toast.error('La imagen del banner es requerida');
      return;
    }

    setSaving(true);
    try {
      if (selectedBanner) {
        await axios.put(`${API}/admin/banners/${selectedBanner.banner_id}`, formData, { withCredentials: true });
        toast.success('Banner actualizado');
      } else {
        await axios.post(`${API}/admin/banners`, formData, { withCredentials: true });
        toast.success('Banner creado');
      }
      
      setDialogOpen(false);
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBanner) return;
    
    try {
      await axios.delete(`${API}/admin/banners/${selectedBanner.banner_id}`, { withCredentials: true });
      toast.success('Banner eliminado');
      setDeleteDialogOpen(false);
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar');
    }
  };

  const toggleActive = async (banner) => {
    try {
      await axios.put(`${API}/admin/banners/${banner.banner_id}`, {
        ...banner,
        is_active: !banner.is_active
      }, { withCredentials: true });
      toast.success(banner.is_active ? 'Banner desactivado' : 'Banner activado');
      fetchBanners();
    } catch (err) {
      toast.error('Error al actualizar estado');
    }
  };

  const moveOrder = async (banner, direction) => {
    const currentIndex = banners.findIndex(b => b.banner_id === banner.banner_id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= banners.length) return;
    
    const otherBanner = banners[newIndex];
    
    try {
      await Promise.all([
        axios.put(`${API}/admin/banners/${banner.banner_id}`, { ...banner, order: otherBanner.order }, { withCredentials: true }),
        axios.put(`${API}/admin/banners/${otherBanner.banner_id}`, { ...otherBanner, order: banner.order }, { withCredentials: true })
      ]);
      fetchBanners();
    } catch (err) {
      toast.error('Error al reordenar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-banners">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Banners de Publicidad</h1>
          <p className="text-muted-foreground">
            {banners.length} banner{banners.length !== 1 ? 's' : ''} - Se muestran en el inicio de la tienda
          </p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary rounded-sm" data-testid="create-banner-btn">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Banner
        </Button>
      </div>

      {/* Info */}
      <Card className="rounded-sm bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Tamaño recomendado:</strong> 1920x600 px para escritorio, 800x400 px para móvil.
            Los banners se mostrarán en un carrusel en la página de inicio.
          </p>
        </CardContent>
      </Card>

      {/* Banners List */}
      <div className="space-y-4">
        {banners.map((banner, index) => (
          <Card key={banner.banner_id} className={`rounded-sm overflow-hidden ${!banner.is_active ? 'opacity-60' : ''}`}>
            <div className="flex flex-col md:flex-row">
              {/* Image Preview */}
              <div className="md:w-80 h-40 md:h-auto relative bg-muted flex-shrink-0">
                <img 
                  src={banner.image || 'https://via.placeholder.com/400x200?text=Sin+imagen'} 
                  alt={banner.title || 'Banner'}
                  className="w-full h-full object-cover"
                />
                {!banner.is_active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="secondary" className="bg-white">Inactivo</Badge>
                  </div>
                )}
              </div>
              
              {/* Banner Info */}
              <CardContent className="flex-1 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                      {banner.is_active ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Activo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactivo</Badge>
                      )}
                    </div>
                    <h3 className="font-bold text-lg truncate">{banner.title || 'Sin título'}</h3>
                    {banner.subtitle && (
                      <p className="text-muted-foreground text-sm truncate">{banner.subtitle}</p>
                    )}
                    {banner.link && (
                      <a 
                        href={banner.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {banner.link}
                      </a>
                    )}
                    {banner.button_text && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Botón: "{banner.button_text}"
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveOrder(banner, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveOrder(banner, 'down')}
                        disabled={index === banners.length - 1}
                        className="h-8 w-8"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleActive(banner)}
                        className="h-8 w-8"
                        title={banner.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {banner.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(banner)}
                        className="h-8 w-8"
                        data-testid={`edit-banner-${banner.banner_id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => { setSelectedBanner(banner); setDeleteDialogOpen(true); }}
                        data-testid={`delete-banner-${banner.banner_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>

      {banners.length === 0 && (
        <Card className="rounded-sm">
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay banners</p>
            <p className="text-sm">Crea tu primer banner para mostrar en la página de inicio</p>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBanner ? 'Editar Banner' : 'Nuevo Banner'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Imagen Principal */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-blue-500" />
                Imagen del Banner (Escritorio) *
              </Label>
              <p className="text-xs text-muted-foreground mb-2">Tamaño recomendado: 1920x600 px</p>
              
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Subir Imagen</TabsTrigger>
                  <TabsTrigger value="url">URL Manual</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="mt-4">
                  <ImageUpload
                    folder="banners"
                    multiple={false}
                    maxFiles={1}
                    existingImages={formData.image ? [formData.image] : []}
                    onUploadComplete={(uploadedImages) => {
                      if (uploadedImages.length > 0) {
                        setFormData(prev => ({ ...prev, image: uploadedImages[0].url }));
                      }
                    }}
                    onRemoveImage={() => {
                      setFormData(prev => ({ ...prev, image: '' }));
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="url" className="mt-4">
                  <Input
                    value={formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://..."
                    className="rounded-sm"
                  />
                  {formData.image && (
                    <img src={formData.image} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-sm" />
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Imagen Móvil (Opcional) */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-green-500" />
                Imagen para Móvil (Opcional)
              </Label>
              <p className="text-xs text-muted-foreground mb-2">Tamaño recomendado: 800x400 px. Si no se sube, se usará la imagen principal.</p>
              
              <Tabs defaultValue="upload-mobile" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload-mobile">Subir Imagen</TabsTrigger>
                  <TabsTrigger value="url-mobile">URL Manual</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload-mobile" className="mt-4">
                  <ImageUpload
                    folder="banners"
                    multiple={false}
                    maxFiles={1}
                    existingImages={formData.image_mobile ? [formData.image_mobile] : []}
                    onUploadComplete={(uploadedImages) => {
                      if (uploadedImages.length > 0) {
                        setFormData(prev => ({ ...prev, image_mobile: uploadedImages[0].url }));
                      }
                    }}
                    onRemoveImage={() => {
                      setFormData(prev => ({ ...prev, image_mobile: '' }));
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="url-mobile" className="mt-4">
                  <Input
                    value={formData.image_mobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_mobile: e.target.value }))}
                    placeholder="https://..."
                    className="rounded-sm"
                  />
                  {formData.image_mobile && (
                    <img src={formData.image_mobile} alt="Preview móvil" className="mt-2 w-full h-32 object-cover rounded-sm" />
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Título y Subtítulo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Título (Opcional)</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej: Gran Oferta de Verano"
                  className="rounded-sm mt-1"
                />
              </div>
              <div>
                <Label>Subtítulo (Opcional)</Label>
                <Input
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Ej: Hasta 50% de descuento"
                  className="rounded-sm mt-1"
                />
              </div>
            </div>

            {/* Link y Botón */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Link al hacer clic (Opcional)</Label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                  placeholder="Ej: /categoria/ofertas o https://..."
                  className="rounded-sm mt-1"
                />
              </div>
              <div>
                <Label>Texto del Botón (Opcional)</Label>
                <Input
                  value={formData.button_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                  placeholder="Ej: Ver Ofertas"
                  className="rounded-sm mt-1"
                />
              </div>
            </div>

            {/* Estado Activo */}
            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Banner activo (visible en la tienda)</Label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary rounded-sm" data-testid="save-banner-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El banner "{selectedBanner?.title || 'Sin título'}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBanners;
