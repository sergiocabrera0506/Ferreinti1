import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Plus, Search, Edit, Trash2, Loader2, Package, X, Save, ImagePlus, Upload, FileSpreadsheet, Check,
  LayoutGrid, LayoutList, Eye, Cloud
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import ImageUpload from '../../components/ImageUpload';

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
  is_new: false
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
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  
  // CSV Import states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

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
      is_new: product.is_new || false
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error('Nombre, precio y categoría son requeridos');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        original_price: formData.original_price ? parseFloat(formData.original_price) : null,
        stock: parseInt(formData.stock) || 0
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

  // CSV Import Functions
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      
      const product = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        value = value.replace(/^"|"$/g, '');
        
        // Map common CSV headers to our format
        if (header.includes('nombre') || header.includes('name') || header.includes('title')) {
          product.name = value;
        } else if (header.includes('descripcion') || header.includes('description') || header.includes('body')) {
          product.description = value;
        } else if (header.includes('precio') || header.includes('price')) {
          product.price = parseFloat(value) || 0;
        } else if (header.includes('sku') || header.includes('codigo') || header.includes('handle')) {
          product.sku = value;
        } else if (header.includes('stock') || header.includes('cantidad') || header.includes('inventory')) {
          product.stock = parseInt(value) || 0;
        } else if (header.includes('imagen') || header.includes('image') || header.includes('src')) {
          if (value) {
            product.images = product.images || [];
            product.images.push(value);
          }
        } else if (header.includes('categoria') || header.includes('category') || header.includes('type')) {
          product.category_name = value;
        }
      });
      
      if (product.name) {
        product.sku = product.sku || `SKU-${Date.now()}-${i}`;
        product.stock = product.stock || 10;
        product.images = product.images || [];
        products.push(product);
      }
    }
    
    return products;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo CSV');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const parsedProducts = parseCSV(text);
      if (parsedProducts.length === 0) {
        toast.error('No se encontraron productos válidos en el CSV');
        return;
      }
      setCsvData(parsedProducts);
      setImportDialogOpen(true);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const importProducts = async () => {
    if (csvData.length === 0) return;
    
    setImporting(true);
    setImportProgress({ current: 0, total: csvData.length });
    
    let imported = 0;
    let skipped = 0;
    
    for (let i = 0; i < csvData.length; i++) {
      const prod = csvData[i];
      setImportProgress({ current: i + 1, total: csvData.length });
      
      try {
        // Find category by name or use first one
        let categoryId = categories[0]?.category_id;
        if (prod.category_name) {
          const foundCat = categories.find(c => 
            c.name.toLowerCase().includes(prod.category_name.toLowerCase())
          );
          if (foundCat) categoryId = foundCat.category_id;
        }
        
        const payload = {
          name: prod.name,
          description: prod.description || '',
          price: prod.price || 0,
          sku: prod.sku,
          stock: prod.stock,
          category_id: categoryId,
          images: prod.images,
          features: [],
          is_offer: false,
          is_bestseller: false,
          is_new: true
        };
        
        await axios.post(`${API}/admin/products`, payload, { withCredentials: true });
        imported++;
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.detail?.includes('SKU')) {
          skipped++;
        } else {
          console.error('Error importing:', prod.name, err);
          skipped++;
        }
      }
    }
    
    setImporting(false);
    setImportDialogOpen(false);
    setCsvData([]);
    toast.success(`Importación completada: ${imported} importados, ${skipped} omitidos`);
    fetchProducts();
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
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="csv-file-input"
            />
            <Button variant="outline" className="rounded-sm" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" /> Importar CSV
              </span>
            </Button>
          </label>
          <Button onClick={openCreateDialog} className="bg-primary rounded-sm" data-testid="create-product-btn">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
          </Button>
        </div>
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
            {/* View Toggle */}
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
                data-testid="view-list-btn"
              >
                <LayoutList className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
                data-testid="view-grid-btn"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
            <Card key={product.product_id} className="rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-muted">
                <img
                  src={product.images?.[0] || 'https://via.placeholder.com/200'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {product.is_offer && <Badge className="bg-orange-500 text-white text-xs">Oferta</Badge>}
                  {product.is_new && <Badge className="bg-green-500 text-white text-xs">Nuevo</Badge>}
                  {product.is_bestseller && <Badge className="bg-blue-500 text-white text-xs">Top</Badge>}
                </div>
                {product.stock <= 5 && (
                  <Badge className="absolute top-2 right-2 bg-red-500 text-white text-xs">
                    Stock: {product.stock}
                  </Badge>
                )}
              </div>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                <h3 className="font-medium text-sm line-clamp-2 mt-1">{product.name}</h3>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <span className="font-bold text-primary">${product.price?.toFixed(2)}</span>
                    {product.original_price && (
                      <span className="text-xs text-muted-foreground line-through ml-1">
                        ${product.original_price?.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                </div>
                <div className="flex gap-1 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 rounded-lg"
                    onClick={() => openEditDialog(product)}
                  >
                    <Edit className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => { setSelectedProduct(product); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Products Table View */}
      {viewMode === 'list' && (
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
      )}

      {/* Empty state for grid view */}
      {viewMode === 'grid' && products.length === 0 && (
        <Card className="rounded-sm">
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay productos</p>
          </div>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
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

      {/* CSV Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!importing) setImportDialogOpen(open); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Importar Productos desde CSV
            </DialogTitle>
          </DialogHeader>
          
          {!importing ? (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                Se encontraron <span className="font-bold text-foreground">{csvData.length}</span> productos para importar.
                Los productos con SKU duplicado serán omitidos.
              </div>
              
              <ScrollArea className="flex-1 -mx-6 px-6 max-h-[50vh]">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Nombre</th>
                      <th className="text-left p-2 font-medium">SKU</th>
                      <th className="text-right p-2 font-medium">Precio</th>
                      <th className="text-right p-2 font-medium">Stock</th>
                      <th className="text-left p-2 font-medium">Imagen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {csvData.map((prod, idx) => (
                      <tr key={idx} className="hover:bg-muted/50">
                        <td className="p-2 max-w-[200px] truncate">{prod.name}</td>
                        <td className="p-2 font-mono text-xs">{prod.sku}</td>
                        <td className="p-2 text-right">${prod.price?.toFixed(2) || '0.00'}</td>
                        <td className="p-2 text-right">{prod.stock}</td>
                        <td className="p-2">
                          {prod.images?.[0] ? (
                            <img src={prod.images[0]} alt="" className="w-8 h-8 object-cover rounded" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
              
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => { setImportDialogOpen(false); setCsvData([]); }} className="rounded-sm">
                  Cancelar
                </Button>
                <Button onClick={importProducts} className="bg-primary rounded-sm" data-testid="confirm-import-btn">
                  <Upload className="w-4 h-4 mr-2" /> Importar {csvData.length} Productos
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-medium">Importando productos...</p>
              <p className="text-muted-foreground">
                {importProgress.current} de {importProgress.total}
              </p>
              <div className="w-full bg-muted rounded-full h-2 mt-4 max-w-md mx-auto">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
