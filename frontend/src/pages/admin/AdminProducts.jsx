import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Plus, Search, Edit, Trash2, Loader2, Package, X, Save, ImagePlus, Ruler
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '../../components/ui/alert-dialog';
import { ScrollArea } from '../../components/ui/scroll-area';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const emptyProduct = {
  name: '',
  description: '',
  price: '',
  original_price: '',
  category_id: '',
  sku: '',
  stock: '',
  images: [],
  features: [],
  is_offer: false,
  is_bestseller: false,
  is_new: false,
  has_variants: false,
  variants: []
};

export const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [newImage, setNewImage] = useState('');
  const [newFeature, setNewFeature] = useState('');

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      
      const response = await axios.get(`${API}/admin/products?${params}`, { withCredentials: true });
      setProducts(response.data.products);
    } catch (err) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, categoryFilter]);

  const openCreateDialog = () => {
    setSelectedProduct(null);
    setFormData(emptyProduct);
    setDialogOpen(true);
  };

  const openEditDialog = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      original_price: product.original_price?.toString() || '',
      category_id: product.category_id || '',
      sku: product.sku || '',
      stock: product.stock?.toString() || '',
      images: product.images || [],
      features: product.features || [],
      is_offer: product.is_offer || false,
      is_bestseller: product.is_bestseller || false,
      is_new: product.is_new || false,
      has_variants: product.has_variants || false,
      variants: product.variants || []
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error('Nombre, precio y categoría son requeridos');
      return;
    }

    // Validar variantes si están activas
    if (formData.has_variants && formData.variants.length === 0) {
      toast.error('Agrega al menos una medida/variante');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        stock: parseInt(formData.stock) || 0,
        has_variants: formData.has_variants,
        variants: formData.variants
      };

      if (selectedProduct) {
        await axios.put(`${API}/admin/products/${selectedProduct.product_id}`, payload, { withCredentials: true });
        toast.success('Producto actualizado');
      } else {
        await axios.post(`${API}/admin/products`, payload, { withCredentials: true });
        toast.success('Producto creado');
      }
      
      setDialogOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      await axios.delete(`${API}/admin/products/${selectedProduct.product_id}`, { withCredentials: true });
      toast.success('Producto eliminado');
      setDeleteDialogOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar');
    }
  };

  const addImage = () => {
    if (newImage.trim()) {
      setFormData(prev => ({ ...prev, images: [...prev.images, newImage.trim()] }));
      setNewImage('');
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-products">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground">{products.length} productos</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary rounded-sm" data-testid="create-product-btn">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-sm"
                data-testid="search-products"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-sm">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Producto</th>
                <th className="px-4 py-3 text-left text-sm font-medium hidden md:table-cell">SKU</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Precio</th>
                <th className="px-4 py-3 text-left text-sm font-medium hidden sm:table-cell">Stock</th>
                <th className="px-4 py-3 text-left text-sm font-medium hidden lg:table-cell">Etiquetas</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(product => (
                <tr key={product.product_id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={product.images?.[0] || 'https://via.placeholder.com/40'} 
                        alt="" 
                        className="w-10 h-10 object-cover rounded-sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate max-w-[200px]">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {categories.find(c => c.category_id === product.category_id)?.name || '-'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell font-mono">
                    {product.sku}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-bold">${product.price?.toFixed(2)}</span>
                      {product.original_price && (
                        <span className="text-xs text-muted-foreground line-through ml-2">
                          ${product.original_price?.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant={product.stock < 10 ? 'destructive' : 'secondary'}>
                      {product.stock}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {product.is_offer && <Badge className="bg-amber-100 text-amber-800 text-xs">Oferta</Badge>}
                      {product.is_bestseller && <Badge className="bg-blue-100 text-blue-800 text-xs">Top</Badge>}
                      {product.is_new && <Badge className="bg-green-100 text-green-800 text-xs">Nuevo</Badge>}
                      {product.has_variants && <Badge className="bg-purple-100 text-purple-800 text-xs">Medidas</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(product)}
                        data-testid={`edit-product-${product.product_id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive"
                        onClick={() => { setSelectedProduct(product); setDeleteDialogOpen(true); }}
                        data-testid={`delete-product-${product.product_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay productos</p>
          </div>
        )}
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: 'calc(95vh - 150px)' }}>
            <div className="space-y-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="rounded-sm mt-1"
                    data-testid="product-name-input"
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    className="rounded-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="rounded-sm mt-1"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Precio *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    className="rounded-sm mt-1"
                    data-testid="product-price-input"
                  />
                </div>
                <div>
                  <Label>Precio Original</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.original_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                    className="rounded-sm mt-1"
                  />
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    className="rounded-sm mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Categoría *</Label>
                <Select 
                  value={formData.category_id || 'none'} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, category_id: val === 'none' ? '' : val }))}
                >
                  <SelectTrigger className="rounded-sm mt-1" data-testid="product-category-select">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Images */}
              <div>
                <Label>Imágenes</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="URL de imagen"
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    className="rounded-sm"
                  />
                  <Button type="button" variant="outline" onClick={addImage} className="rounded-sm">
                    <ImagePlus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.images.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {formData.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt="" className="w-16 h-16 object-cover rounded-sm" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Features */}
              <div>
                <Label>Características</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Nueva característica"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    className="rounded-sm"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" variant="outline" onClick={addFeature} className="rounded-sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.features.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {formData.features.map((feat, idx) => (
                      <Badge key={idx} variant="secondary" className="pr-1">
                        {feat}
                        <button onClick={() => removeFeature(idx)} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_offer}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_offer: checked }))}
                  />
                  <Label>Oferta</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_bestseller}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_bestseller: checked }))}
                  />
                  <Label>Top Ventas</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_new}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_new: checked }))}
                  />
                  <Label>Nuevo</Label>
                </div>
              </div>

              {/* ============================================================
                  📏 VARIANTES/MEDIDAS - Sección para productos como brocas
                  ============================================================ */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-3 mb-4">
                  <Switch
                    checked={formData.has_variants}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      has_variants: checked,
                      variants: checked ? prev.variants : []
                    }))}
                    data-testid="has-variants-switch"
                  />
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-blue-500" />
                    <Label className="font-medium">Tiene varias medidas/tamaños</Label>
                  </div>
                </div>

                {formData.has_variants && (
                  <div className="bg-blue-50 p-4 rounded-sm border border-blue-200">
                    <Label className="text-sm font-medium text-blue-800 mb-3 block">
                      Medidas disponibles (ej: brocas, tornillos, cables)
                    </Label>
                    
                    {/* Add new variant */}
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="Medida (ej: 3mm, 5mm)"
                        id="new-variant-size"
                        className="rounded-sm flex-1"
                      />
                      <Input
                        placeholder="Precio"
                        type="number"
                        step="0.01"
                        id="new-variant-price"
                        className="rounded-sm w-24"
                      />
                      <Input
                        placeholder="Stock"
                        type="number"
                        id="new-variant-stock"
                        className="rounded-sm w-20"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="rounded-sm bg-blue-500 text-white hover:bg-blue-600"
                        onClick={() => {
                          const sizeInput = document.getElementById('new-variant-size');
                          const priceInput = document.getElementById('new-variant-price');
                          const stockInput = document.getElementById('new-variant-stock');
                          
                          const size = sizeInput.value.trim();
                          const price = parseFloat(priceInput.value) || 0;
                          const stock = parseInt(stockInput.value) || 0;
                          
                          if (!size) {
                            toast.error('Ingresa la medida');
                            return;
                          }
                          if (price <= 0) {
                            toast.error('Ingresa un precio válido');
                            return;
                          }
                          if (formData.variants.some(v => v.size === size)) {
                            toast.error('Esta medida ya existe');
                            return;
                          }
                          
                          setFormData(prev => ({
                            ...prev,
                            variants: [...prev.variants, { size, price, stock }]
                          }));
                          
                          sizeInput.value = '';
                          priceInput.value = '';
                          stockInput.value = '';
                          toast.success(`Medida ${size} agregada`);
                        }}
                        data-testid="add-variant-btn"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Variants list */}
                    {formData.variants.length > 0 ? (
                      <div className="space-y-2">
                        {formData.variants.map((variant, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-sm border">
                            <span className="font-bold text-blue-700 w-20">{variant.size}</span>
                            <span className="text-sm text-muted-foreground">Precio:</span>
                            <span className="font-medium">${variant.price?.toFixed(2)}</span>
                            <span className="text-sm text-muted-foreground ml-2">Stock:</span>
                            <span className="font-medium">{variant.stock}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="ml-auto h-7 w-7 text-destructive hover:bg-red-100"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  variants: prev.variants.filter((_, i) => i !== idx)
                                }));
                                toast.success('Medida eliminada');
                              }}
                              data-testid={`remove-variant-${idx}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-blue-600 text-center py-2">
                        No hay medidas agregadas. Usa el formulario de arriba para agregar.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary rounded-sm" data-testid="save-product-btn">
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
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El producto "{selectedProduct?.name}" será eliminado permanentemente.
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

export default AdminProducts;
