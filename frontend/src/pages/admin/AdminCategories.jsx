import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Plus, Edit, Trash2, Loader2, FolderOpen, X, Save, Cloud
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../../components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import ImageUpload from '../../components/ImageUpload';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const iconOptions = [
  { value: 'Wrench', label: 'Llave/Herramienta' },
  { value: 'Hammer', label: 'Martillo' },
  { value: 'Zap', label: 'Electricidad/Rayo' },
  { value: 'Lightbulb', label: 'Bombilla/Iluminación' },
  { value: 'Cable', label: 'Cable/Conexiones' },
  { value: 'Droplets', label: 'Agua/Plomería' },
  { value: 'ChefHat', label: 'Cocina' },
  { value: 'Settings', label: 'Configuración/Engranaje' },
  { value: 'Circle', label: 'Círculo/General' },
  { value: 'PaintBucket', label: 'Pintura' },
  { value: 'Lock', label: 'Cerrajería/Seguridad' },
  { value: 'Ruler', label: 'Medición' },
  { value: 'Drill', label: 'Taladro' },
  { value: 'Scissors', label: 'Tijeras/Corte' },
  { value: 'Plug', label: 'Enchufe' },
  { value: 'Thermometer', label: 'Temperatura' },
  { value: 'Home', label: 'Hogar' },
  { value: 'Truck', label: 'Transporte' },
];

const emptyCategory = {
  name: '',
  slug: '',
  image: '',
  icon: 'Wrench'
};

export const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState(emptyCategory);
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/admin/categories`, { withCredentials: true });
      setCategories(response.data.categories);
    } catch (err) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const openCreateDialog = () => {
    setSelectedCategory(null);
    setFormData(emptyCategory);
    setDialogOpen(true);
  };

  const openEditDialog = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      image: category.image,
      icon: category.icon
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Nombre y slug son requeridos');
      return;
    }

    setSaving(true);
    try {
      if (selectedCategory) {
        await axios.put(`${API}/admin/categories/${selectedCategory.category_id}`, formData, { withCredentials: true });
        toast.success('Categoría actualizada');
      } else {
        await axios.post(`${API}/admin/categories`, formData, { withCredentials: true });
        toast.success('Categoría creada');
      }
      
      setDialogOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    
    try {
      await axios.delete(`${API}/admin/categories/${selectedCategory.category_id}`, { withCredentials: true });
      toast.success('Categoría eliminada');
      setDeleteDialogOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar');
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
    <div className="space-y-6" data-testid="admin-categories">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-muted-foreground">{categories.length} categorías</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary rounded-sm" data-testid="create-category-btn">
          <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => (
          <Card key={category.category_id} className="rounded-sm overflow-hidden">
            <div className="aspect-video relative">
              <img 
                src={category.image || 'https://via.placeholder.com/400x200'} 
                alt={category.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-bold text-lg">{category.name}</h3>
                <p className="text-white/70 text-sm">{category.slug}</p>
              </div>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Icono: {category.icon}</span>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openEditDialog(category)}
                    data-testid={`edit-category-${category.category_id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-destructive"
                    onClick={() => { setSelectedCategory(category); setDeleteDialogOpen(true); }}
                    data-testid={`delete-category-${category.category_id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay categorías</p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCategory ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    name,
                    slug: selectedCategory ? prev.slug : generateSlug(name)
                  }));
                }}
                className="rounded-sm mt-1"
                data-testid="category-name-input"
              />
            </div>
            <div>
              <Label>Slug *</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                className="rounded-sm mt-1"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Cloud className="w-4 h-4 text-blue-500" />
                Imagen de Categoría
              </Label>
              
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Subir Imagen</TabsTrigger>
                  <TabsTrigger value="url">URL Manual</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="mt-4">
                  <ImageUpload
                    folder="categories"
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
                    <div className="relative mt-2 group">
                      <img src={formData.image} alt="Preview" className="w-full h-32 object-cover rounded-sm" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        className="absolute top-2 right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            <div>
              <Label>Icono</Label>
              <Select value={formData.icon} onValueChange={(val) => setFormData(prev => ({ ...prev, icon: val }))}>
                <SelectTrigger className="rounded-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map(icon => (
                    <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary rounded-sm" data-testid="save-category-btn">
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
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La categoría "{selectedCategory?.name}" será eliminada permanentemente.
              Nota: No se puede eliminar una categoría que tiene productos asociados.
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

export default AdminCategories;
